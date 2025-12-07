import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Helper function to parse PDF using Promise
  const parsedText = await new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true); 

    pdfParser.on("pdfParser_dataError", (errData: any) =>
      reject(errData.parserError)
    );

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      // pdf2json returns raw text which might need URI decoding
      resolve(pdfParser.getRawTextContent());
    });

    pdfParser.parseBuffer(buffer);
  });

  return NextResponse.json({ text: parsedText });
}