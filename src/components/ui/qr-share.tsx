"use client";

import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrShareProps {
  url: string;
  shopName: string;
}

export function QrShare({ url, shopName }: QrShareProps) {
  
  const downloadQR = () => {
    const canvas = document.getElementById("shop-qr-code") as HTMLCanvasElement;
    if (!canvas) return;
    
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
      
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${shopName.replace(/\s+/g, "_").toLowerCase()}_qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white border rounded-xl shadow-sm">
      <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl mb-6 shadow-sm">
        <QRCodeCanvas
          id="shop-qr-code"
          value={url}
          size={200}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"Q"}
          imageSettings={{
            src: "/icon-192.png",
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">Share Your Store</h3>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Print this QR code for your physical store or share it online for customers to scan.
      </p>
      
      <Button onClick={downloadQR} className="w-full gap-2">
        <Download className="w-4 h-4" /> Download QR Code
      </Button>
    </div>
  );
}
