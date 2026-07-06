"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { FileWarning, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./pdf-viewer.css";

// Point pdf.js at its worker. `new URL(..., import.meta.url)` is understood by
// both Vite (apps/web) and webpack (apps/docs), so the worker is bundled as a
// local asset — no CDN, no CSP escape hatch. The bare specifier resolves the
// `pdfjs-dist` we pin to react-pdf's exact version, so worker and API never skew.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/** The PDF source: a URL string, a File/Blob, or raw bytes. */
export type PdfSource = string | File | Blob | ArrayBuffer;

export interface PdfViewerProps {
  /** The PDF to render — a URL, a File/Blob, or an ArrayBuffer of bytes. */
  file: PdfSource;
  /** Extra classes on the viewer root. */
  className?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;
// Inline breathing room around a page so it never touches the scroll edges; the
// fit-to-width base subtracts it so a page at 100% exactly fills the column.
const PAGE_GUTTER = 32;

/**
 * Continuous, fit-to-width PDF viewer built on react-pdf (pdf.js). Pages stack
 * in a scrollable column sized to the container; zoom in/out scales past the
 * width (adding horizontal scroll), and a toolbar tracks "page X of N" as you
 * scroll. Renders loading and error states inline.
 *
 * Layout-neutral: it fills its parent's width and height (`h-full`), making no
 * assumptions about the surrounding page — give it a sized box. Client-only
 * (pdf.js needs a browser); mount it behind a client boundary such as TanStack's
 * `<ClientOnly>`.
 */
export function PdfViewer({ file, className }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);

  // Track the scroll container's width so pages can fit to it responsively.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        setContainerWidth(width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // State follows react-pdf's own load lifecycle rather than a file-watching
  // effect: when `file` changes, <Document> resets itself and swaps to its
  // loading node (not the page children) until the new parse resolves, then fires
  // this — so a fresh document reliably resets the page count and position.
  const handleLoadSuccess = useCallback(
    ({ numPages: loaded }: { numPages: number }) => {
      setNumPages(loaded);
      setCurrentPage(1);
    },
    []
  );

  // Follow the scroll position: the page nearest the top of the viewport is the
  // one the reader is on. Cheaper and steadier than an IntersectionObserver here
  // because pages are uniform-ish and stacked.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) {
      return;
    }
    const pages = el.querySelectorAll<HTMLElement>("[data-page]");
    const anchor = el.getBoundingClientRect().top + el.clientHeight / 3;
    let nearest = 1;
    for (const page of pages) {
      if (page.getBoundingClientRect().top <= anchor) {
        nearest = Number(page.dataset.page);
      } else {
        break;
      }
    }
    setCurrentPage(nearest);
  }, [numPages]);

  const zoom = useCallback((delta: number) => {
    setScale((s) =>
      Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.round((s + delta) * 100) / 100)
      )
    );
  }, []);

  const pageWidth =
    containerWidth === null
      ? undefined
      : Math.max(containerWidth - PAGE_GUTTER, 0) * scale;

  const pages = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages]
  );

  return (
    <div
      className={cn(
        "pdf-viewer flex h-full flex-col overflow-hidden rounded-md border bg-muted/30",
        className
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 text-sm backdrop-blur">
        <span className="text-muted-foreground tabular-nums">
          {numPages > 0 ? `Page ${currentPage} of ${numPages}` : "—"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Zoom out"
            className="text-muted-foreground"
            disabled={scale <= MIN_SCALE}
            onClick={() => zoom(-SCALE_STEP)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ZoomOut />
          </Button>
          <span className="w-12 text-center text-muted-foreground tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            aria-label="Zoom in"
            className="text-muted-foreground"
            disabled={scale >= MAX_SCALE}
            onClick={() => zoom(SCALE_STEP)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ZoomIn />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto px-4 py-4"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        <Document
          className="flex flex-col items-center gap-4"
          error={
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileWarning className="size-6" />
              <p className="text-sm">Couldn’t load this PDF.</p>
            </div>
          }
          file={file}
          loading={
            <div className="flex h-full items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          }
          noData={null}
          onLoadSuccess={handleLoadSuccess}
        >
          {pages.map((pageNumber) => (
            <div data-page={pageNumber} key={pageNumber}>
              <Page
                className="overflow-hidden rounded-sm shadow-sm ring-1 ring-black/5"
                loading={
                  <div
                    className="animate-pulse rounded-sm bg-muted"
                    style={{
                      height: pageWidth ? pageWidth * 1.29 : 400,
                      width: pageWidth ?? "100%",
                    }}
                  />
                }
                pageNumber={pageNumber}
                width={pageWidth}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
