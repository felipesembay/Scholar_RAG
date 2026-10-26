import { WorkspacesIcon, ForumIcon } from "./icons";

interface FeatureCardProps {
  type: 'projects' | 'chatbot';
}

function ProjectsCard() {
  return (
    <div className="bg-surface box-border content-stretch flex flex-col gap-2.5 items-start justify-start p-[16px] relative rounded-xl shrink-0">
      <div
        aria-hidden="true"
        className="absolute border border-line border-solid inset-0 pointer-events-none rounded-xl shadow-sm"
      />
      
      <div className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-14">
        <WorkspacesIcon color="var(--primary)" />
      </div>
      
      <div className=" font-bold leading-[0] relative shrink-0 text-ink text-[28px] text-center text-nowrap">
        <p className="block leading-[normal] whitespace-pre">Gerencie seus Projetos</p>
      </div>
      
      <div className=" font-normal leading-[0] relative shrink-0 text-ink text-[18px] text-left w-[528px]">
        <p className="block leading-[normal]">
          Crie, organize e acompanhe o progresso de todos os seus projetos de Inteligência Artificial em um só lugar.
        </p>
      </div>
      
      <button className="bg-primary-strong box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-8 py-4 relative rounded-xl shrink-0 hover:bg-[#2d0070] transition-colors">
        <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-primary-foreground text-[18px] text-center text-nowrap">
          <p className="block leading-[normal] whitespace-pre">Adicionar um projeto</p>
        </div>
      </button>
    </div>
  );
}

function ChatbotCard() {
  return (
    <div className="bg-surface box-border content-stretch flex flex-col gap-2.5 items-start justify-start p-[16px] relative rounded-xl shrink-0">
      <div
        aria-hidden="true"
        className="absolute border border-line border-solid inset-0 pointer-events-none rounded-xl shadow-sm"
      />
      
      <div className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-14">
        <ForumIcon color="var(--primary)" />
      </div>
      
      <div className=" font-bold leading-[0] relative shrink-0 text-ink text-[28px] text-center text-nowrap">
        <p className="block leading-[normal] whitespace-pre">Converse com o Assistente</p>
      </div>
      
      <div className=" font-normal leading-[0] relative shrink-0 text-ink text-[18px] text-left w-[528px]">
        <p className="block leading-[normal]">
          Tire dúvidas, peça ajuda para suas tarefas ou explore as capacidades da nossa IA conversacional.
        </p>
      </div>
      
      <button className="bg-primary-soft box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-8 py-4 relative rounded-xl shrink-0 hover:bg-primary-soft-strong transition-colors">
        <div className="absolute border border-primary-strong border-solid inset-0 pointer-events-none rounded-xl" />
        <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-primary text-[18px] text-center text-nowrap">
          <p className="block leading-[normal] whitespace-pre">Conhecer o Chatbot</p>
        </div>
      </button>
    </div>
  );
}

export default function FeatureCard({ type }: FeatureCardProps) {
  if (type === 'projects') {
    return <ProjectsCard />;
  }
  
  return <ChatbotCard />;
}