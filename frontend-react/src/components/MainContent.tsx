import Header from "./Header";
import FeatureCard from "./FeatureCard";

function WelcomeHeading() {
  return (
    <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center leading-[0] p-0 relative shrink-0 text-ink text-nowrap">
      <div className=" font-bold relative shrink-0 text-[0px] text-left">
        <p className="leading-[normal] text-[48px] text-nowrap whitespace-pre">
          <span className=" font-bold">{`Bem-vindo ao `}</span>
          <span className=" font-extrabold text-primary">
            ScholarRAG
          </span>
        </p>
      </div>
      <div className=" font-normal relative shrink-0 text-[24px] text-center">
        <p className="block leading-[normal] text-nowrap whitespace-pre">
          Aplicação para gerenciar seus projetos de IA e interagir com nosso Assistente Virtual.
        </p>
      </div>
    </div>
  );
}

function FeatureCards() {
  return (
    <div className="box-border content-stretch flex flex-row gap-6 items-start justify-start p-0 relative shrink-0">
      <FeatureCard type="projects" />
      <FeatureCard type="chatbot" />
    </div>
  );
}

function FAQText() {
  return (
    <div className=" font-normal leading-[0] relative shrink-0 text-ink text-[0px] text-center text-nowrap">
      <p className="leading-[normal] text-[24px] whitespace-pre">
        Se tiver alguma dúvida sobre como usar a ferramenta, veja a
        <span className=" font-bold text-primary">&nbsp;</span>
        <a
          className="[text-decoration-line:underline] [text-decoration-skip-ink:none] [text-decoration-style:solid] [text-underline-position:from-font] cursor-pointer font-bold text-primary hover:text-primary-strong transition-colors"
          href="#"
        >
          <span className="[text-decoration-line:underline] [text-decoration-skip-ink:none] [text-decoration-style:solid] [text-underline-position:from-font] leading-[normal]">
            página de FAQ
          </span>
        </a>
        <span className=" font-bold text-primary">.</span>
      </p>
    </div>
  );
}

export default function MainContent() {
  return (
    <div className="basis-0 bg-surface-muted box-border content-stretch flex flex-col grow h-full items-start justify-start min-h-px min-w-px p-0 relative shrink-0">
      <Header />
      
      <div className="basis-0 grow min-h-px min-w-px relative shrink-0 w-full">
        <div className="relative size-full">
          <div className="box-border content-stretch flex flex-col gap-16 items-start justify-start pb-16 pt-[18px] px-16 relative size-full">
            <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start p-0 relative shrink-0">
              <WelcomeHeading />
              <FeatureCards />
            </div>
            
            <FAQText />
          </div>
        </div>
      </div>
    </div>
  );
}