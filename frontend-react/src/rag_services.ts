// Arquivo responsável por importar as APIS do backend para o FronEnd
import axios from "axios";
import { ProjectData } from "../../frontend-react/src/components/modals/CreateProjectModal"

export async function setSumarize(postData: {
        word_limit: number, summarize_all: boolean, additional_info: string, files: File[], parameters: string
    }){
    const formData = new FormData();
    formData.append('word_limit',postData.word_limit.toString());
    formData.append('summarize_all',postData.summarize_all.toString());
    formData.append('additional_info',postData.additional_info);
    postData.files.forEach(file => {
        formData.append('files', file); 
    }); 
    formData.append('parameters',postData.parameters ?? '');

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_summarize');
    try {
        //const response = axios.post('http://localhost:8000/summarize/', formData, {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Sumarização conluída com Sucesso!', response.data);     
        //return response.data;   
        return response;
    } catch (error) {
        console.error('Erro na Sumarização, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }
}
export async function getEnviromentVars(field: string ){
    try {

        let field_name = '';
        const response = await axios.get(import.meta.env.VITE_API_URL + import.meta.env.VITE_API_GET_ENV_VARS);
        console.log('Variável Ambiental Carregada da Camada de Serviços:FrontEnd (rag_services.ts) - ');
        Object.keys(response.data.backend_env).map((key, index) => (
            field_name = response.data.backend_env[key][field]
        ));  
        return field_name.toString()  
      
    } catch (error) {
        console.error('Erro na Carga de Variáveis Ambientais, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}

export function TrataPhrase(PhraseToUpper: string ) {
  let textFinal = PhraseToUpper.trim();
  textFinal = textFinal.charAt(0).toUpperCase() + textFinal.slice(1);
  return textFinal;
}
export async function existProject(project_name: string ){
    const formData = new FormData();
    formData.append('project_name',project_name);
    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_existprj');
      
    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Procura de Projeto Executada com Sucesso!');     
        if(response.data["project"] === "TRUE"){
            return true;
        }else{
            return false;
        }
    } catch (error) {
        console.error('Erro na Procura de Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function validateNewProject(project: ProjectData , prompt: boolean, hasPassword: boolean){   
    try {
       if(project.projectName.trim() === "")
        {
            return "[ERRO]: Por favor, digite o nome do projeto!";
        }
       else if(project.projectName.length > 30 )
        {
            return "[ERRO]: O nome do projeto deve ter no máximo 30 caracteres!";
        }
       else if(project.username.trim() === "" )
        {
            return "[ERRO]: Por favor, digite seu usuário!";
        }
       else if(project.username.length > 30 )
        {
            return "[ERRO]: O nome do usuário deve ter no máximo 30 caracteres!";
        }
        else if(hasPassword && project.password.length < 5 )
        {
            return "[ERRO]: A senha deve ter no mínimo 5 caracteres!";
        }    
       else if(hasPassword && project.password.length > 25 )
        {
            return "[ERRO]: A senha deve ter no máximo 25 caracteres!";
        }    
       else if(hasPassword &&  project.password != project.confirmPassword)
        {
            return "[ERRO]: A senha digitada para confirmação é diferente da primeira senha!";
        }         
       else if(prompt && project.prompt.length  < 50 )
        {
            return "[ERRO]: O prompt deve ter mais de 50 caracteres!";
        }    
       else if(prompt && project.prompt.length  > 2000 )
        {
            return "[ERRO]: O prompt deve ter no máximo 2000 caracteres!";
        }  
       else if(await existProject(project.projectName))
        {
            return "[ERRO]: Já existe um projeto com esse nome!";            
        }
       else if(project.uploadMethod === "manual" && project.files.length === 0)
        {
            return "[ERRO]: Por favor, envie ao menos um arquivo!";
        } 
       else if(project.uploadMethod === "manual" && project.files.length > 1000)
        {
            return "[ERRO]: O limite de arquivos para submissão é 1000!";
        } 
       else
        {
            return "[OK]" ;
        } 
    }
    catch (error) {
        console.error('Erro na Execução de Consistência:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }      
}

// Criado por Felipe em 16/09/2025

export type FAQItem = {
  question: string;
  answer: string;
};

export async function getFAQ(): Promise<FAQItem[]> {
  try {
    const apiUrl: string =
      (await getEnviromentVars("url_back")) + (await getEnviromentVars("suburl_faq"));

    const response = await axios.get(apiUrl);
    const data = response.data;

    if (Array.isArray(data)) {
      return data as FAQItem[];
    } else if (data?.faq && Array.isArray(data.faq)) {
      return data.faq as FAQItem[];
    }

    console.warn("Estrutura de resposta do FAQ inesperada:", data);
    return [];
  } catch (error) {
    console.error("Erro na Carga do FAQ (rag_services.ts): ", error);
    throw error;
  }
}


export async function setSaveProject(postData: {
        project_name: string, 
        user_name: string, 
        password: string, 
        upload_method: string, 
        prompt: string,
        prompt_mode: string,
        files: File[], 
    }){
      
    const formData = new FormData();
    formData.append('project_name',postData.project_name);
    formData.append('user_name',postData.user_name);
    formData.append('password',postData.password);
    formData.append('upload_method',postData.upload_method);
    formData.append('prompt',postData.prompt ?? '');
    formData.append('prompt_mode',postData.prompt_mode ?? '');    
    postData.files.forEach(file => {
        formData.append('files', file); 
    }); 


    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_saveprj');
    try {
        //const response = axios.post('http://localhost:8000/summarize/', formData, {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Gravação de Projeto Concluída com Sucesso!');     
        return response;
    } catch (error) {
        console.error('Erro na Gravação de Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }
}
export async function listAllProjects(){ 
    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_loadprjs');
    try {
        //let field_name = '';
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });       
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Listagem de Todos os Projetos Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Listagem de Todos os Projetos, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function checkPassword(postData: {
        project_name: string, 
        password: string 
    }){

    const formData = new FormData();
    formData.append('project_name',postData.project_name);
    formData.append('password',postData.password);

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_chkpass');
    try {
        //let field_name = '';
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Checagem de Permissões do Projeto, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Checagem de Permissões do Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}

export async function setUpdateProjet(postData: {
        project_name: string, 
        user_name: string, 
        password: string, 
        upload_method: string, 
        prompt: string,
        files: File[], 
    }){
      
    const formData = new FormData();
    formData.append('project_name',postData.project_name);
    formData.append('user_name',postData.user_name);
    formData.append('password',postData.password);
    formData.append('upload_method',postData.upload_method);
    formData.append('prompt',postData.prompt ?? '');
    postData.files.forEach(file => {
        formData.append('files', file); 
    }); 

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_updateprj');
    try {
        let field_name = '';
        const response = await axios.put(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Atualização de Projeto Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Atualização de Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function retrieveProjectInfo(postData: {
        project_name: string
    }){

    const formData = new FormData();
    formData.append('project_name',postData.project_name);


    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_infoprj');
    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Recuperação de Informações do Projeto, Concluída com Sucesso!');     
        return response.data;
    } catch (error) {
        console.error('Erro na Recuperação de Informações do Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function deleteProject(postData: {
        project_name: string
    }){

    const formData = new FormData();
    formData.append('project_name',postData.project_name);

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_deleteprj');
    try {
        const response = await axios.delete(apiUrl, {
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Exclusão do Projeto, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Exclusão do Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function initChatBot(postData: {
        project_name: string
    }){

    const formData = new FormData();
    formData.append('project_name',postData.project_name);

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_initchatprj');
    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Criação do ChatBot, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Criação do ChatBot, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}

export async function msgChatBot(postData: {
        project_name:  string
        temperature:   number  ,  
        similarity:    number  ,    
        debug_mode:    string  ,    
        flag_download: string  ,
        user_input:    string  ,
        use_param:     string
    }){
    const formData = new FormData();
    formData.append('project_name',postData.project_name);
    formData.append('temperature',postData.temperature.toString());
    formData.append('similarity',postData.similarity.toString());
    formData.append('debug_mode',postData.debug_mode);
    formData.append('flag_download',postData.flag_download);
    formData.append('user_input',postData.user_input);   
    formData.append('use_param',postData.use_param ?? '');        

    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_msgchatprj');
    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Envio de Mensagem do ChatBot, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro no Envio de Mensagens, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function getInteractProjects(){
    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_getinteractprj');

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Carga de Interações de Projeto, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Carga de Interações de Projeto, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
export async function getAllProjects(){
    const apiUrl: string = await getEnviromentVars('url_back') + await getEnviromentVars('suburl_getprojets');

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });        
        console.log('Camada de Serviços:FrontEnd (rag_services.ts) - Carga de Lista de Projetos, Concluída com Sucesso!');     
        return response;

    } catch (error) {
        console.error('Erro na Carga de Lista de Projetos, na Camada de Serviços:FrontEnd (rag_services.ts) - ', error);
        throw error;
    }       
}
