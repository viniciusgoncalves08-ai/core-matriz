import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { globalSearch } from "@/features/search/search-service";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 try{
  const userId=await getSessionUserId();
  if(!userId)return NextResponse.json({error:"Entre para pesquisar."},{status:401,headers});
  return NextResponse.json(await globalSearch(userId,Object.fromEntries(new URL(request.url).searchParams)),{headers});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Digite entre 2 e 120 caracteres e confira a categoria.":"Não foi possível pesquisar agora."},{status:error instanceof z.ZodError?400:500,headers});}
}
