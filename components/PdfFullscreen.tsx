import { Expand, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useState } from "react";
import SimpleBar from "simplebar-react";
import { Document, Page } from "react-pdf";
import { useToast } from "./ui/use-toast";
import { useResizeDetector } from "react-resize-detector";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PdfFullscreenProps {
  url: string;
}

const PdfFullscreen = ({ url }: PdfFullscreenProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number>();

  const { toast } = useToast();
  const { width, ref } = useResizeDetector();

  return (
    <Dialog
      open={isFullscreen}
      onOpenChange={(visible) => {
        if (!visible) {
          setIsFullscreen(visible);
        }
      }}
    >
      <DialogTrigger asChild onClick={() => setIsFullscreen(true)}>
        <Button variant="ghost" aria-label="fullscreen" className="gap-1.5">
          <Expand className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl w-full">
        <VisuallyHidden asChild>
          <DialogTitle title="PDF Preview" />
        </VisuallyHidden>
        <SimpleBar autoHide={false} className="max-h-[calc(100vh-10rem)] mt-6">
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
              {/* This is the main change. We created an array of size equal to
              number of pages and then filled it with 0 (any value). Then we
              mapped over it and created a Page component for each page.
              Alternative to this is to use a for loop and create Page
              components in it. */}

              {new Array(numPages).fill(0).map((_, index) => (
                <Page
                  key={index}
                  pageNumber={index + 1}
                  width={width ? width : 1}
                />
              ))}
            </Document>
          </div>
        </SimpleBar>
      </DialogContent>
    </Dialog>
  );
};

export default PdfFullscreen;
