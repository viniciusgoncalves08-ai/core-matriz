import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionCard } from "./action-cards";
import type { ActionView } from "./action-schema";
const project: ActionView = {id:"p",version:1,tool:"project.create",permission:"CONFIRM",status:"pending",expiresAt:"2026-12-25T00:00:00.000Z",input:{name:"Loja",description:"",status:"IDEA"}};
it("renders project review fields instead of task fields",()=>{
 const html=renderToStaticMarkup(<ActionCard action={project} onUpdate={()=>{}} />);
 expect(html).toContain("Nome do projeto");
 expect(html).toContain("Situação inicial");
 expect(html).toContain("Confirmar e criar projeto");
 expect(html).not.toContain("Prazo opcional");
});
it("links to a confirmed project without another confirmation button",()=>{
 const html=renderToStaticMarkup(<ActionCard action={{...project,status:"succeeded",projectId:"saved"}} onUpdate={()=>{}} />);
 expect(html).toContain('/projetos/saved');
 expect(html).not.toContain("Confirmar e criar projeto");
});
it("preserves existing task review fields",()=>{
 const action:ActionView={id:"t",version:1,tool:"task.create",permission:"CONFIRM",status:"pending",expiresAt:"2026-12-25T00:00:00.000Z",input:{title:"Ligar",priority:0,dueAt:null}};
 const html=renderToStaticMarkup(<ActionCard action={action} onUpdate={()=>{}} />);
 expect(html).toContain("Prazo opcional");
 expect(html).toContain("Confirmar e criar tarefa");
 expect(html).not.toContain("Nome do projeto");
});
