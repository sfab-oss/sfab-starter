import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Index } from "@workspace/ui-ds/__index__";
import {
  type registryItemFileSchema,
  registryItemSchema,
} from "@workspace/ui-ds/config/schema";
import { Project, ScriptKind } from "ts-morph";
import { z } from "zod";

// Get the directory of this file (packages/ui-ds/src/lib/)
// Then go up to packages/ui-ds/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DS_ROOT = path.resolve(__dirname, "../..");

export function getRegistryComponent(name: string) {
  return Index[name]?.component;
}

function resolveFilePath(filePath: string): string {
  // Handle paths that start with "../" (external packages like @workspace/ui)
  // These are relative to the ui-ds package root
  if (filePath.startsWith("../")) {
    return path.resolve(UI_DS_ROOT, filePath);
  }
  // Handle paths that start with "./" or "src/" (already prefixed)
  // These are relative to the ui-ds package root
  if (filePath.startsWith("./") || filePath.startsWith("src/")) {
    const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
    return path.resolve(UI_DS_ROOT, cleanPath);
  }
  // Otherwise, assume it's relative to src/components within ui-ds
  return path.resolve(UI_DS_ROOT, "src/components", filePath);
}

export async function getRegistryItem(name: string) {
  const item = Index[name];

  if (!item) {
    return null;
  }

  // Convert all file paths to object.
  item.files = (item.files || []).map((file: unknown) =>
    typeof file === "string" ? { path: file } : file
  );

  // Fail early before doing expensive file operations.
  const result = z
    .object({
      files: z.array(z.any()).optional(),
    })
    .safeParse(item);

  if (!(result.success && item.files) || item.files.length === 0) {
    return null;
  }

  console.log("[getRegistryItem] Processing files:", item.files);

  let files: Array<
    z.infer<typeof registryItemFileSchema> & { content?: string }
  > = [];
  for (const file of item.files) {
    const filePath = typeof file === "string" ? file : file.path;
    if (!filePath) {
      continue;
    }

    const resolvedPath = resolveFilePath(filePath);

    const content = await getFileContent({
      path: resolvedPath,
      type: typeof file === "object" ? file.type : "registry:ui",
    });

    const relativePath = path.relative(UI_DS_ROOT, resolvedPath);

    files.push({
      ...(typeof file === "object" ? file : { path: filePath }),
      path: relativePath,
      content,
    });
  }

  // Fix file paths.
  files = fixFilePaths(files);

  const parsed = registryItemSchema.safeParse({
    ...item,
    files,
  });

  if (!parsed.success) {
    console.error(parsed.error.message);
    return null;
  }

  return parsed.data;
}

async function getFileContent(file: { path: string; type: string }) {
  try {
    const raw = await fs.readFile(file.path, "utf-8");

    const project = new Project({
      compilerOptions: {},
    });

    const tempFile = await createTempSourceFile(file.path);
    const sourceFile = project.createSourceFile(tempFile, raw, {
      scriptKind: ScriptKind.TSX,
    });

    let code = sourceFile.getFullText();

    // Some registry items use default export.
    // We want to use named export instead.
    if (file.type !== "registry:page") {
      code = code.replaceAll("export default", "export");
    }

    // Fix imports.
    code = fixImport(code);

    return code;
  } catch (error) {
    console.error(`Error reading file ${file.path}:`, error);
    return "";
  }
}

function getFileTarget(file: z.infer<typeof registryItemFileSchema>) {
  let target = file.target;

  if (!target || target === "") {
    const fileName = file.path.split("/").pop();
    if (
      file.type === "registry:block" ||
      file.type === "registry:component" ||
      file.type === "registry:example"
    ) {
      target = `components/${fileName}`;
    }

    if (file.type === "registry:ui") {
      target = `components/ui/${fileName}`;
    }

    if (file.type === "registry:hook") {
      target = `hooks/${fileName}`;
    }

    if (file.type === "registry:lib") {
      target = `lib/${fileName}`;
    }
  }

  return target ?? "";
}

async function createTempSourceFile(filename: string) {
  const dir = await fs.mkdtemp(path.join(tmpdir(), "shadcn-"));
  return path.join(dir, path.basename(filename));
}

function fixFilePaths(
  files: Array<z.infer<typeof registryItemFileSchema> & { content?: string }>
) {
  if (!files || files.length === 0) {
    return [];
  }

  // Resolve all paths relative to the first file's directory.
  const firstFilePath = files?.[0]?.path ?? "";
  const firstFilePathDir = path.dirname(firstFilePath);

  return files.map((file) => {
    return {
      ...file,
      path: path.relative(firstFilePathDir, file.path),
      target: getFileTarget(file),
    };
  });
}

export function fixImport(content: string) {
  const regex = /@\/(.+?)\/((?:.*?\/)?(?:components|ui|hooks|lib))\/([\w-]+)/g;

  const replacement = (
    match: string,
    _path: string,
    type: string,
    component: string
  ) => {
    if (type.endsWith("components")) {
      return `@/components/${component}`;
    }
    if (type.endsWith("ui")) {
      return `@/components/ui/${component}`;
    }
    if (type.endsWith("hooks")) {
      return `@/hooks/${component}`;
    }
    if (type.endsWith("lib")) {
      return `@/lib/${component}`;
    }

    return match;
  };

  return content.replace(regex, replacement);
}

export interface FileTree {
  name: string;
  path?: string;
  children?: FileTree[];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Ok
export function createFileTreeForRegistryItemFiles(
  files: Array<{ path: string; target?: string }>
) {
  const root: FileTree[] = [];

  for (const file of files) {
    const filePath = file.target ?? file.path;
    const parts = filePath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }
      const isFile = i === parts.length - 1;
      const existingNode = currentLevel.find((node) => node.name === part);

      if (existingNode) {
        if (isFile) {
          // Update existing file node with full path
          existingNode.path = filePath;
        } else {
          // Move to next level in the tree
          // biome-ignore lint/style/noNonNullAssertion: Ok
          currentLevel = existingNode.children!;
        }
      } else {
        const newNode: FileTree = isFile
          ? { name: part, path: filePath }
          : { name: part, children: [] };

        currentLevel.push(newNode);

        if (!isFile) {
          // biome-ignore lint/style/noNonNullAssertion: Ok
          currentLevel = newNode.children!;
        }
      }
    }
  }

  return root;
}

export function getAllRegistryItems(
  types: z.infer<typeof registryItemSchema>["type"][] = [],
  categories: string[] = []
) {
  const index = z.record(z.string(), registryItemSchema).parse(Index);

  return Object.values(index).filter((item) => {
    const typeMatch = types.length === 0 || types.includes(item.type);
    const categoryMatch =
      categories.length === 0 ||
      item.categories?.some((cat) => categories.includes(cat));

    return typeMatch && categoryMatch;
  });
}

export async function getAllRegistryItemIds(
  types: z.infer<typeof registryItemSchema>["type"][] = [],
  categories: string[] = []
): Promise<string[]> {
  const items = await getAllRegistryItems(types, categories);
  return items.map((item) => item.name);
}

export function getExamplesForComponent(componentName: string) {
  const item = Index[componentName];
  return item?.meta?.examples || [];
}
