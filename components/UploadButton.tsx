"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";

const UploadButton = () => {
  const [isOpen, setIsOpen] = useState<Boolean>(false);

  return (
    <Dialog
      open={isOpen as boolean}
      onOpenChange={(visible) => {
        if (!visible) setIsOpen(visible);
      }}
    >
      <DialogTrigger onClick={() => setIsOpen(true)} asChild>
        <Button>Upload PDF</Button>
      </DialogTrigger>

      <DialogContent>Dummy content</DialogContent>
    </Dialog>
  );
};

export default UploadButton;
