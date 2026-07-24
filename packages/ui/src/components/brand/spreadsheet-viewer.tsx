"use client";

import type { IWorkbookData } from "@univerjs/core";
import { LocaleType, LogLevel, merge, Univer } from "@univerjs/core";
import { FUniver } from "@univerjs/core/facade";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import SheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { defaultTheme } from "@univerjs/themes";
import { cn } from "@workspace/ui/lib/utils";
import LuckyExcel from "@zwight/luckyexcel";
import { FileWarning, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
import "./spreadsheet-viewer.css";

/** The spreadsheet source: a URL string, a File/Blob, or an ArrayBuffer of bytes. */
export type SpreadsheetSource = string | File | Blob | ArrayBuffer;

export interface SpreadsheetViewerProps {
  /** The `.xlsx` to render — a URL, a File/Blob, or an ArrayBuffer of bytes. */
  file: SpreadsheetSource;
  /** Extra classes on the viewer root. */
  className?: string;
}

async function toFile(src: SpreadsheetSource): Promise<File> {
  if (src instanceof File) {
    return src;
  }
  if (typeof src === "string") {
    const res = await fetch(src);
    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${res.status}`);
    }
    return new File([await res.blob()], "spreadsheet.xlsx");
  }
  return new File([src], "spreadsheet.xlsx");
}

// The importer speaks its browser callback API; wrap it as a promise. This is the
// open-source LuckyExcel → Univer bridge: it parses the workbook entirely in the
// browser and returns Univer's native IWorkbookData, so we never need Univer's
// commercial, server-bound import service.
function importWorkbook(file: File): Promise<IWorkbookData> {
  return new Promise((resolve, reject) => {
    LuckyExcel.transformExcelToUniver(
      file,
      (data) => resolve(data),
      (err) => reject(err)
    );
  });
}

/**
 * Stand up a read-only Univer sheet in `container`. This inlines what
 * `@univerjs/presets`' `createUniver` does — new Univer, register the preset's
 * plugins, wrap in the Facade — deliberately, because the package that exports
 * `createUniver` also pulls in ~27 commercial `@univerjs-pro/*` packages. We
 * depend only on the Apache-2.0 `@univerjs/preset-sheets-core` instead.
 */
function mountViewer(
  container: HTMLElement,
  data: IWorkbookData,
  dark: boolean
): Univer {
  const univer = new Univer({
    theme: defaultTheme,
    darkMode: dark,
    locale: LocaleType.EN_US,
    locales: { [LocaleType.EN_US]: merge({}, SheetsCoreEnUS) },
    logLevel: LogLevel.SILENT,
  });

  // A viewer, not an editor: no toolbar, formula bar, or context menu. The footer
  // stays for sheet-tab navigation across a multi-sheet workbook.
  const preset = UniverSheetsCorePreset({
    container,
    header: false,
    formulaBar: false,
    contextMenu: false,
  });
  for (const entry of preset.plugins) {
    if (Array.isArray(entry)) {
      univer.registerPlugin(entry[0], entry[1]);
    } else {
      univer.registerPlugin(entry);
    }
  }

  const univerAPI = FUniver.newAPI(univer);
  univerAPI.createWorkbook(data).setEditable(false);
  return univer;
}

/**
 * Read-only spreadsheet viewer. Renders an `.xlsx` with full fidelity — styles,
 * merges, and formulas (their imported values) — on Univer (the open-source
 * successor to Luckysheet), importing via the client-side LuckyExcel bridge so
 * no Univer server or commercial license is involved.
 *
 * Layout-neutral: it fills its parent (`h-full`); give it a sized box. Follows
 * `next-themes` for light/dark. Client-only (Univer needs a browser); mount it
 * behind a client boundary such as TanStack's `<ClientOnly>`.
 */
export function SpreadsheetViewer({ file, className }: SpreadsheetViewerProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<IWorkbookData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  // Import the workbook whenever the source changes. Kept separate from mounting
  // so a theme toggle re-skins the sheet without re-parsing the file.
  // biome-ignore lint/plugin/no-use-effect: 3rd-party widget / imperative DOM sync
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setData(null);
    (async () => {
      try {
        const workbook = await importWorkbook(await toFile(file));
        if (!cancelled) {
          setData(workbook);
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // (Re)mount Univer when the imported data or the theme changes.
  // biome-ignore lint/plugin/no-use-effect: 3rd-party widget / imperative DOM sync
  useEffect(() => {
    if (!(data && containerRef.current)) {
      return;
    }
    let univer: Univer | null = null;
    try {
      univer = mountViewer(
        containerRef.current,
        data,
        resolvedTheme === "dark"
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
    return () => univer?.dispose();
  }, [data, resolvedTheme]);

  return (
    <div
      className={cn(
        "spreadsheet-viewer relative h-full w-full overflow-hidden rounded-md border bg-background",
        className
      )}
    >
      <div className="h-full w-full" ref={containerRef} />
      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background text-muted-foreground">
          {status === "loading" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <>
              <FileWarning className="size-6" />
              <p className="text-sm">Couldn’t load this spreadsheet.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
