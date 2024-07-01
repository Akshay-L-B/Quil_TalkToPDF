"use client";

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Search,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useToast } from "./ui/use-toast";
import { useResizeDetector } from "react-resize-detector";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import SimpleBar from "simplebar-react";
import PdfFullscreen from "./PdfFullscreen";

// Set the worker source to be used by pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface FileProps {
  url: string;
}

const PdfRenderer = ({ url }: FileProps) => {
  const { toast } = useToast();
  const { width, ref } = useResizeDetector();

  // To count the total number of pages in the PDF
  const [numPages, setNumPages] = useState<number>();
  const [curPage, setCurPage] = useState<number>(1);
  const [inputBoxPage, setInputBoxPage] = useState<string>(
    curPage ? curPage.toString() : "1"
  );
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  return (
    <div className="w-full bg-white rounded-md shadow flex flex-col items-center">
      <div className="h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            aria-label="previous page"
            disabled={curPage === 1}
            onClick={() => {
              if (curPage > 1) {
                setCurPage(curPage - 1);
              }
            }}
          >
            <ChevronDown />
          </Button>

          <div className="flex items-center gap-1.5">
            <Input
              className="w-12 h-8"
              onChange={(e) => {
                setInputBoxPage(e.target.value);
                const inputPage = parseInt(e.target.value);
                if (inputPage > 0 && inputPage <= numPages!) {
                  setCurPage(inputPage);
                }
              }}
              value={inputBoxPage}
            />
            <p className="text-zinc-700 text-sm space-x-1">
              <span>/</span>
              <span>{numPages ? numPages : "x"}</span>
            </p>
          </div>

          <Button
            variant="ghost"
            aria-label="next page"
            disabled={curPage === numPages}
            onClick={() => {
              if (curPage < numPages!) {
                setCurPage(curPage + 1);
              }
            }}
          >
            <ChevronUp />
          </Button>
        </div>

        {/* Zoom in and zoom out buttons */}
        <div className="space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="zoom" className="gap-1.5">
                <Search className="h-4 w-4" />
                {scale * 100}% <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setScale(0.75)}>
                75%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setScale(1)}>
                100%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setScale(1.5)}>
                150%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setScale(2)}>
                200%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setScale(2.5)}>
                250%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rotate */}
          <Button
            variant="ghost"
            aria-label="rotate right by 90 degrees"
            onClick={() => {
              setRotation(rotation + 90);
            }}
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* For full screen */}
          <PdfFullscreen url={url} />
        </div>
      </div>

      <div className="flex-1 w-full max-h-screen">
        {/* Now this div has the ref of the hook, so the width of this div is stored automatically in the width property of the hook */}
        <SimpleBar autoHide={false} className="max-h-[calc(100vh-10rem)]">
          <div ref={ref}>
            <Document
              className="max-h-full"
              file={url}
              loading={
                <div className="flex justify-center">
                  <Loader2 className="my-24 h-6 w-6 animate-spin" />
                </div>
              }
              // This function is called when the PDF is loaded
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
              }}
              // This function is called when there is an error loading the PDF
              onLoadError={() => {
                toast({
                  title: "Error loading PDF",
                  description:
                    "There was an error loading the PDF file. Please try again.",
                  variant: "destructive",
                });
              }}
            >
              <Page
                pageNumber={curPage}
                width={width ? width : 1}
                scale={scale}
                rotate={rotation}
              />
            </Document>
          </div>
        </SimpleBar>
      </div>
    </div>
  );
};

export default PdfRenderer;
