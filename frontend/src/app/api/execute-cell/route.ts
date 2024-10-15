import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.method === "POST") {
    try {
      const response = await fetch("http://localhost:8000/execute-cell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(await req.json()),
      });
      const result = await response.json();

      return NextResponse.json({ output: result.output });
    } catch (error) {
      return NextResponse.json(
        { error: error || "Error executing cell" },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { message: "Method Not Allowed" },
      { status: 405 }
    );
  }
}
