import { useState } from "react";
import { Search, FolderOpen, FileText } from "lucide-react";


interface FileProject {
  id: string;
  name: string;
  words: number;
}[];

interface FileList {
  file_name: string;
  word_count: number;
}[];

interface ProjectDetailDash {
  id: string;
  name: string;
  owner: string;
  creationDate: string;
  totalFiles: number;
  totalWords: number;
  files: FileProject[];
}
// interface ProjectFile {
//   id: string;
//   name: string;
//   words: number;
// }


//export default function ProjectDetailsView() {
export default function ProjectDetailsView({ chartProjectDetail }: { chartProjectDetail: ProjectDetailDash[] }) {
  const [selectedProjectId, setSelectedProjectId] = useState("1");
  
  const selectedProject = chartProjectDetail.find(p => p.id === selectedProjectId) || chartProjectDetail[0];
  
  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  return (
    <div className="flex flex-col component-gap">
      <div className="flex items-center element-gap mb-4">
        <Search className="w-5 h-5 text-[#3b82f6]" />
        <h3 className="component-title">Detalhes do Projeto</h3>
      </div>
      
      <p className="body-text text-muted-foreground mb-6">
        Selecione um projeto para visualizar informações detalhadas, incluindo arquivos, 
        estatísticas e metadados completos.
      </p>

      <div className="bg-surface p-6 rounded-lg border border-line flex flex-col component-gap">
        {/* Project Selector */}
        <div className="flex flex-col element-gap">
          <label className="label-text">Selecione um projeto:</label>
          <div className="relative">
            <select
              className="select-base"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {chartProjectDetail.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-muted rounded-lg">
          <div className="flex flex-col element-gap">
            <div>
              <span className="label-text">Nome:</span>
              <span className="body-text ml-2">{selectedProject.name}</span>
            </div>
            
            <div>
              <span className="label-text">Dono do Projeto:</span>
              <span className="body-text ml-2">{selectedProject.owner}</span>
            </div>
            
            <div>
              <span className="label-text">Data de Criação:</span>
              <span className="body-text ml-2">{selectedProject.creationDate}</span>
            </div>
          </div>
          
          <div className="flex flex-col element-gap">
            <div>
              <span className="label-text">Arquivos:</span>
              <span className="body-text ml-2">{selectedProject.totalFiles}</span>
            </div>
            
            <div>
              <span className="label-text">Palavras no Projeto:</span>
              <span className="body-text ml-2">{formatNumber(selectedProject.totalWords)}</span>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="flex flex-col component-gap">
          <div className="flex items-center element-gap">
            <FolderOpen className="w-5 h-5 text-[#f59e0b]" />
            <h4 className="component-title">Arquivos do Projeto</h4>
          </div>
          
          <div className="flex flex-col element-gap max-h-[300px] overflow-y-auto custom-scrollbar">
            {selectedProject.files.map(file => (
              <div 
                key={file.id}
                className="flex items-start justify-between p-3 bg-surface-muted border border-line rounded-lg hover:bg-surface-muted transition-colors"
              >
                <div className="flex items-start element-gap flex-1">
                  <FileText className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <span className="body-text-sm flex-1 break-words">{file.name}</span>
                </div>
                <span className="body-text-sm text-muted-foreground ml-4 flex-shrink-0">
                  ({formatNumber(file.words)} palavras)
                </span>
              </div>
            ))}
          </div>
          
          {selectedProject.files.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="body-text">Nenhum arquivo encontrado neste projeto.</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-line">
          <div className="flex items-center element-gap px-3 py-2 bg-primary-soft rounded-lg">
            <FileText className="w-4 h-4 text-primary" />
            <span className="body-text-sm">
              <strong>{selectedProject.totalFiles}</strong> arquivos
            </span>
          </div>
          <div className="flex items-center element-gap px-3 py-2 bg-[#e6f3ff] rounded-lg">
            <Search className="w-4 h-4 text-[#3b82f6]" />
            <span className="body-text-sm">
              <strong>{formatNumber(selectedProject.totalWords)}</strong> palavras
            </span>
          </div>
          <div className="flex items-center element-gap px-3 py-2 bg-[#f0fdf4] rounded-lg">
            <FolderOpen className="w-4 h-4 text-[#10b981]" />
            <span className="body-text-sm">
              Criado em <strong>{selectedProject.creationDate}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}