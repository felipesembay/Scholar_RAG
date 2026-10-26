import { useState, useEffect } from "react";
import { Upload, Play, MessageSquare, User } from "lucide-react";
import svgPaths from "../../imports/svg-urhv50y58j";
import Breadcrumb from "../navigation/Breadcrumb";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../utils/clipboard";
//import axios from "axios";
import { setSumarize } from "../../rag_services.ts";
//import { addUniqueItem } from "motion/react";
import LoadingState from "../ui/LoadingState";


// Radio Button Components baseados no Figma
function RadioButtonChecked() {
  return (
    <div className="relative shrink-0 size-6 text-primary" data-name="radio_button_checked">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" role="presentation" viewBox="0 0 24 24">
        <g id="radio_button_checked">
          <path d={svgPaths.p4501f00} fill="currentColor" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function RadioButtonUnchecked() {
  return (
    <div className="relative shrink-0 size-6 text-ink-soft" data-name="radio_button_unchecked">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" role="presentation" viewBox="0 0 24 24">
        <g id="radio_button_unchecked">
          <path d={svgPaths.p26f9ce00} fill="currentColor" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

interface SummaryFormData {
  wordCount: string;
  customPrompt: string;
  summaryMethod: 'all' | 'individual';
  files: File[];
}

interface SummaryResult {
  id: string;
  prompt: string;
  results: {
    id: string;
    title: string;
    content: string;
    relatedFiles: string[];
  }[];
  createdAt: string;
}

interface results{
  id: string;
  title: string;
  content: string;
  relatedFiles: string[];
}

export default function SumarizadorContent({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const [formData, setFormData] = useState<SummaryFormData>({
    wordCount: '',
    customPrompt: '',
    summaryMethod: 'individual',
    files: []
  });

  const [summaryResults, setSummaryResults] = useState<SummaryResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError } = useToast();
  const { copy } = useClipboard(showSuccess, showError);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  };

  const triggerFileUpload = () => {
    document.getElementById('file-upload')?.click();
  };

  const handleGenerateSummary = async () => {
    if (!formData.wordCount || formData.files.length === 0) {
      alert('Por favor, preencha o número de palavras e adicione pelo menos um arquivo.');
      return;
    }

    setIsAnalyzing(true);
    setIsProcessing(true);


    const summa=(formData.summaryMethod === 'all') ? true : false;
    try {

      const response = await setSumarize({
        word_limit: Number(formData.wordCount),
        summarize_all: summa,
        additional_info: formData.customPrompt,
        files: formData.files,
        parameters: ''
      });

      if (response.status === 200 && response.data.summaries ) {
        console.log('Camada de Aplicação:FrontEnd (SumarizadoContext.tsx) - Documentos processados com sucesso!', response);       
        if (Object.keys(response.data.summaries).length === 0) {  
            showError("ATENÇÃO. Nenhum resumo foi encontrado. Verifique os arquivos enviados e tente novamente!");
        } else
        {
            var documentos = 0;
            let results: results[] = [];
            Object.keys(response.data.summaries).map((chave, index) => (
              documentos = (documentos + 1),
              results.push(
                  { id: documentos.toString(), 
                    title: formData.customPrompt + ' - ' + documentos, 
                    content: response.data.summaries[chave], 
                    relatedFiles: [`[${chave}]`]
                  }
              )
            ));  
            if(results.length == 1 && formData.summaryMethod === 'all'){
              const fileName = '[' + formData.files.map(file => file.name).join('], [') + ']';
              //results[0].relatedFiles = [`${formData.files}`];
              results[0].relatedFiles = [fileName]
            }

            const newResult: SummaryResult = {
              id: Date.now().toString(),
              prompt: formData.customPrompt || 'Resumo',
              results,
              createdAt: new Date().toISOString()
            };
            setSummaryResults(prev => [newResult, ...prev]);
            showSuccess("Total de documento(s) resumido(s) com sucesso foi de : " + formData.files.length + " !");
        }
      } else {
        console.log('Camada de Aplicação:FrontEnd (SumarizadoContext.tsx) - Erro ao processar Documentos!', response);
      }      
    } catch (error) {
      console.error('Erro na Camada de Aplicação:FrontEnd (SumarizadoContext.tsx) - ', error);
    }


    setIsProcessing(false);   
    setIsAnalyzing(false); 

    // Reset form
    setFormData({
      wordCount: '',
      customPrompt: '',
      summaryMethod: 'individual',
      files: []
    });

    // const start = performance.now();
    // // Processamento
    // const end = performance.now();
    // console.log('Tempo decorrido:', end - start, 'ms');


    // // Simular processamento
    // setTimeout(() => {
    //   const newResult: SummaryResult = {
    //     id: Date.now().toString(),
    //     prompt: formData.customPrompt || 'Resumo padrão',
    //     results: [
    //       {
    //         id: '1',
    //         title: '[Texto do primeiro arquivo]',
    //         content: 'Conteúdo do resumo do primeiro arquivo baseado nas configurações definidas...',
    //         relatedFiles: ['[Nome do arquivo]']
    //       },
    //       {
    //         id: '2', 
    //         title: '[Texto do segundo arquivo]',
    //         content: 'Conteúdo do resumo do segundo arquivo baseado nas configurações definidas...',
    //         relatedFiles: ['[Nome do arquivo]']
    //       }
    //     ],
    //     createdAt: new Date().toISOString()
    //   };

    //   setSummaryResults(prev => [newResult, ...prev]);
    //   setIsProcessing(false);
      
    //   // Reset form
    //   setFormData({
    //     wordCount: '',
    //     customPrompt: '',
    //     summaryMethod: 'individual',
    //     files: []
    //   });
    // }, 2000);


  };


  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingState 
          message="Analisando resumos com IA..."
          submessage="Isso pode levar alguns momentos"
        />
      </div>
    );
  }

  return (
    <div className="box-border content-stretch flex flex-col gap-8 items-start justify-start relative size-full">
      <Breadcrumb 
        items={[
          { label: "Sumarizador", isActive: true }
        ]}
        onNavigate={onNavigate || (() => {})}
      />
      
      {/* Header */}
      <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center leading-[0] p-0 relative shrink-0 text-nowrap">
        <div className="page-title relative shrink-0 text-left">
          <p className="block leading-[normal] whitespace-pre">Sumarizador ScholarRAG</p>
        </div>
        <div className=" font-normal relative shrink-0 text-ink text-[24px] md:text-[20px] sm:text-[18px] text-left">
          <p className="block leading-[normal] break-words">Faça resumos competentes de documentos</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-stretch flex gap-8 items-start justify-start relative shrink-0 w-full flex-col lg:flex-row">
        {/* Card de Configuração */}
        <div className="bg-surface box-border content-stretch flex flex-col gap-8 items-start justify-start p-8 relative rounded-xl shrink-0 lg:w-auto w-full border border-line hover:border-primary hover:shadow-sm transition-all duration-300">
          
          <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full">
            {/* Número de palavras */}
            <div className="w-full flex flex-col element-gap items-start justify-start relative">
              <div className="flex flex-col component-title justify-center relative">
                <p className="leading-[normal] whitespace-pre">Número de palavras</p>
              </div>
              <input
                type="number"
                value={formData.wordCount}
                onChange={(e) => setFormData(prev => ({ ...prev, wordCount: e.target.value }))}
                placeholder="Digite quantas palavras terá no seu resumo"
                className="input-base w-full"
              />
            </div>

            {/* Prompt do resumo */}
            <div className="w-full flex flex-col element-gap items-start justify-start relative">
              <div className="flex flex-col component-title justify-center relative">
                <p className="leading-[normal] whitespace-pre">Prompt do resumo</p>
              </div>
              <textarea
                value={formData.customPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                placeholder="Dê instruções detalhadas"
                className="textarea-base h-[157px] w-full"
              />
            </div>

            {/* Forma de resumir */}
            <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full lg:w-[486px]">
              <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-ink text-[18px] text-nowrap">
                <p className="leading-[normal] whitespace-pre">Forma de resumir</p>
              </div>
              <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                  <div 
                    className="content-stretch flex items-center justify-center relative shrink-0 cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, summaryMethod: 'all' }))}
                  >
                    {formData.summaryMethod === 'all' ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
                  </div>
                  <div 
                    className="content-stretch flex gap-2 items-center justify-start relative shrink-0 cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, summaryMethod: 'all' }))}
                  >
                    <div className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-ink text-[18px] text-nowrap">
                      <p className="leading-[1.5] whitespace-pre">Todos</p>
                    </div>
                  </div>
                </div>
                
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-[695px]">
                  <div 
                    className="content-stretch flex items-center justify-center relative shrink-0 cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, summaryMethod: 'individual' }))}
                  >
                    {formData.summaryMethod === 'individual' ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
                  </div>
                  <div 
                    className="content-stretch flex gap-2 items-center justify-start relative shrink-0 cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, summaryMethod: 'individual' }))}
                  >
                    <div className="flex flex-col font-normal justify-center leading-[0] relative shrink-0 text-primary-strong text-[18px] text-nowrap">
                      <p className="leading-[normal] whitespace-pre">Um por um</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="relative shrink-0 w-full">
              <div className="absolute border border-line-strong border-dashed inset-0 pointer-events-none rounded-xl" />
              <div 
                className="flex flex-col items-center justify-center relative size-full cursor-pointer hover:bg-primary-soft transition-colors rounded-xl"
                onClick={triggerFileUpload}
              >
                <div className="box-border content-stretch flex flex-col items-center justify-center p-8 relative w-full">
                  <div className="bg-primary-soft p-4 rounded-xl mb-4">
                    <Upload className="size-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className=" font-bold text-primary text-[16px] mb-2" style={{ fontVariationSettings: "'wdth' 100" }}>
                      Carregue um arquivo
                    </p>
                    <p className=" text-ink text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      ou arraste e solte. 
                      <span className="italic italic text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                        200mb por arquivo
                      </span>
                      <br />
                      <span className=" text-[14px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                        ZIP, RAR, TXT, CSV, XLSX, DOCX, JSON, PDF.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".zip,.rar,.txt,.csv,.xlsx,.docx,.json,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Files list */}
            {formData.files.length > 0 && (
              <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full">
                <div className=" font-bold text-ink text-[16px]">
                  Arquivos selecionados ({formData.files.length}):
                </div>
                {formData.files.map((file, index) => (
                  <div key={index} className="bg-primary-soft px-3 py-2 rounded-lg text-primary text-[14px] " style={{ fontVariationSettings: "'wdth' 100" }}>
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Button */}
          <div className="content-stretch flex gap-4 items-start justify-end relative shrink-0 w-full">
            <button
              onClick={handleGenerateSummary}
              disabled={isProcessing || !formData.wordCount || formData.files.length === 0}
              className="bg-primary box-border content-stretch flex gap-1 items-center justify-center px-6 py-3 relative rounded-xl shrink-0 hover:bg-primary-hover transition-colors disabled:bg-surface-muted disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Play className="size-4 text-primary-foreground mr-2" />
              )}
              <div className="flex flex-col font-bold justify-center leading-[0] relative shrink-0 text-primary-foreground text-[14px] text-center text-nowrap" style={{ fontVariationSettings: "'wdth' 100" }}>
                <p className="leading-[normal] whitespace-pre">
                  {isProcessing ? 'Gerando...' : 'Gerar resumo'}

                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="basis-0 content-stretch flex flex-col grow items-start justify-start min-h-px min-w-px relative shrink-0">
          <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full">
            {/* Prompt Result Card */}
            {summaryResults.length > 0 && (
              <div className="flex justify-end mb-6 w-full">
                <div className="max-w-[70%] flex items-start gap-3">
                  <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
                    <div className=" font-normal text-ink text-[16px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                      {summaryResults[0].prompt || "Resumo personalizado solicitado"}
                    </div>
                  </div>
                  <div className="bg-primary box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12">
                    <User className="size-6 text-primary-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* Summary Results */}
            {summaryResults.length > 0 && summaryResults[0].results.map((result, index) => (
              <div key={result.id} className="flex justify-start mb-6 w-full">
                <div className="max-w-[80%] w-full">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary-soft box-border content-stretch flex flex-col gap-2.5 items-center justify-center px-[3px] py-[5px] relative rounded-xl shrink-0 size-12">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-surface p-4 rounded-xl shadow-sm border border-line">
                        <div className=" font-normal text-ink text-[16px] leading-[1.4] mb-3" style={{ fontVariationSettings: "'wdth' 100" }}>
                          <strong className=" font-bold" style={{ fontVariationSettings: "'wdth' 100" }}>
                            {result.title}
                          </strong>
                        </div>
                        <div className=" font-normal text-ink text-[16px] leading-[1.4]" style={{ fontVariationSettings: "'wdth' 100" }}>
                          {result.content}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-3 items-center justify-start ml-14 mt-2">
                    <button 
                      className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
                      title="Ouvir resumo"
                      onClick={() => {
                        try {
                          if ('speechSynthesis' in window) {
                            speechSynthesis.cancel();
                            const utterance = new SpeechSynthesisUtterance(result.content);
                            utterance.lang = 'pt-BR';
                            utterance.rate = 0.9;
                            utterance.pitch = 1;
                            
                            utterance.onstart = () => {
                              showSuccess("Reproduzindo...", "Áudio iniciado.");
                            };
                            
                            utterance.onerror = (error) => {
                              console.error('Erro na síntese de voz:', error);
                              showError("Erro no áudio", "Não foi possível reproduzir o áudio.");
                            };
                            
                            speechSynthesis.speak(utterance);
                          } else {
                            showError("Não suportado", "Síntese de voz não disponível neste navegador.");
                          }
                        } catch (error) {
                          console.error('Erro ao iniciar síntese de voz:', error);
                          showError("Erro no áudio", "Falha ao iniciar reprodução de áudio.");
                        }
                      }}
                    >
                      <div className="relative shrink-0 size-5 text-muted-foreground hover:text-primary transition-colors">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <path d={svgPaths.p3d54a00} fill="currentColor" />
                        </svg>
                      </div>
                    </button>
                    <button 
                      className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
                      title="Copiar resumo"
                      onClick={async () => {
                        await copy(result.content, "Resumo copiado para a área de transferência.");
                      }}
                    >
                      <div className="relative shrink-0 size-5 text-muted-foreground hover:text-primary transition-colors">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <path d={svgPaths.p22f3db00} fill="currentColor" />
                        </svg>
                      </div>
                    </button>
                    <button 
                      className="p-2 hover:bg-primary-soft rounded-lg transition-colors cursor-pointer"
                      title="Compartilhar resumo"
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              text: result.content,
                              title: result.title
                            });
                            showSuccess("Compartilhado!", "Resumo compartilhado com sucesso.");
                          } else {
                            // Fallback: usar o utilitário de clipboard
                            await copy(result.content, "Conteúdo copiado para área de transferência (compartilhamento não disponível).");
                          }
                        } catch (error) {
                          console.error('Erro ao compartilhar:', error);
                          // Fallback final: usar clipboard
                          await copy(result.content, "Conteúdo copiado como alternativa ao compartilhamento.");
                        }
                      }}
                    >
                      <div className="relative shrink-0 size-5 text-muted-foreground hover:text-primary transition-colors">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <path d={svgPaths.p3a3f7ae0} fill="currentColor" />
                        </svg>
                      </div>
                    </button>
                  </div>
                  
                  {/* Related files */}
                  {result.relatedFiles && result.relatedFiles.length > 0 && (
                    <div className="ml-14 mt-3 p-3 bg-surface-muted rounded-lg border border-line">
                      <div className=" font-bold text-ink text-[13px] mb-2" style={{ fontVariationSettings: "'wdth' 100" }}>
                        Documentos relacionados:
                      </div>
                      <div className="space-y-1">
                        {result.relatedFiles.map((fileName, fileIndex) => (
                          <div key={fileIndex} className="flex gap-2 items-center">
                            <div className="relative shrink-0 size-4 text-primary">
                              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
                                <path d={svgPaths.p338f8c00} fill="currentColor" />
                              </svg>
                            </div>
                            <div className="italic italic text-ink text-[13px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                              {fileName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {summaryResults.length === 0 && (
              <div className="flex items-center justify-center py-16 text-center">
                <div>
                  <div className=" font-bold text-muted-foreground text-[18px] mb-2" style={{ fontVariationSettings: "'wdth' 100" }}>
                    Nenhum resumo gerado ainda
                  </div>
                  <div className=" text-muted-foreground text-[16px]" style={{ fontVariationSettings: "'wdth' 100" }}>
                    Configure os parâmetros e gere seu primeiro resumo
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}