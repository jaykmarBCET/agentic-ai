import generateMain from "@/functions";
import { NextRequest, NextResponse } from "next/server";

export const POST = async(req:NextRequest)=>{

    const {prompt}:{prompt:string} = await req.json();
    
    const response = await generateMain(prompt);

    return NextResponse.json({result:response},{status:200})

}