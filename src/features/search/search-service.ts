import { z } from "zod";
import { db } from "@/lib/db";
export const searchInput = z.object({ q:z.string().trim().min(2).max(120), kind:z.enum(["all","tasks","projects","goals","memories","conversations"]).default("all") }).strict();
export type SearchResult={id:string;kind:string;title:string;excerpt:string;href:string};
export async function globalSearch(userId:string,raw:unknown) {
 const {q,kind}=searchInput.parse(raw);
 const text={contains:q,mode:"insensitive" as const};
 const now = new Date();
 const selected=(name:string)=>kind==="all"||kind===name;
 const groups=await Promise.all([
  selected("tasks")?db.task.findMany({where:{userId,OR:[{title:text},{description:text}]},take:11,orderBy:[{updatedAt:"desc"},{id:"asc"}],select:{id:true,title:true,description:true}}).then(rows=>rows.map(r=>({id:r.id,kind:"tasks",title:r.title,excerpt:r.description?.slice(0,220)??"",href:"/tarefas"}))):[],
  selected("projects")?db.project.findMany({where:{userId,OR:[{name:text},{description:text}]},take:11,orderBy:[{updatedAt:"desc"},{id:"asc"}],select:{id:true,name:true,description:true}}).then(rows=>rows.map(r=>({id:r.id,kind:"projects",title:r.name,excerpt:r.description?.slice(0,220)??"",href:`/projetos/${encodeURIComponent(r.id)}`}))):[],
  selected("goals")?db.goal.findMany({where:{userId,OR:[{title:text},{description:text}]},take:11,orderBy:[{updatedAt:"desc"},{id:"asc"}],select:{id:true,title:true,description:true}}).then(rows=>rows.map(r=>({id:r.id,kind:"goals",title:r.title,excerpt:r.description?.slice(0,220)??"",href:"/objetivos"}))):[],
  selected("memories")?db.memory.findMany({where:{userId,status:"ACTIVE",validFrom:{lte:now},AND:[{OR:[{validUntil:null},{validUntil:{gt:now}}]}],OR:[{content:text},{summary:text},{source:text}]},take:11,orderBy:[{updatedAt:"desc"},{id:"asc"}],select:{id:true,content:true,summary:true}}).then(rows=>rows.map(r=>({id:r.id,kind:"memories",title:r.summary?.slice(0,100)||r.content.slice(0,100),excerpt:r.content.slice(0,220),href:`/memoria/${encodeURIComponent(r.id)}`}))):[],
  selected("conversations")?db.conversation.findMany({where:{userId,OR:[{title:text},{messages:{some:{role:{in:["user","assistant"]},content:text}}}]},take:11,orderBy:[{updatedAt:"desc"},{id:"asc"}],select:{id:true,title:true}}).then(rows=>rows.map(r=>({id:r.id,kind:"conversations",title:r.title||"Conversa sem título",excerpt:"Correspondência no título ou nas mensagens.",href:`/historico/${encodeURIComponent(r.id)}`}))):[],
 ]);
 return {q,results:groups.flatMap(group=>group.slice(0,10)) as SearchResult[],limited:groups.some(group=>group.length>10)};
}
