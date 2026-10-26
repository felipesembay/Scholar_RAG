// Academic API (library, citation style, references, BibTeX, author results)
import axios from 'axios';
import { getEnviromentVars } from './rag_services.ts';

export interface Source {
  n: number;
  source: string;
  page?: number | null;
  page_end?: number | null;
  role: 'literature' | 'results' | 'material';
  title: string;
  citation: string;
  text: string;
}

export interface LibraryEntry {
  source: string;
  citekey: string;
  type: string;
  title: string;
  authors?: string[];
  year?: number;
  venue?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  place?: string;
  edition?: string;
  doi?: string;
  url?: string;
  page_offset?: number;
  pdf_pages?: number;
  edited?: string[];
  role: 'literature' | 'material';
  citation: string;
  reference: string;
}

export interface ResultsFile {
  file_name: string;
  size: number;
  modified: string;
}

async function base(project: string): Promise<string> {
  return `${await getEnviromentVars('url_back')}/academic/${encodeURIComponent(project)}`;
}

export async function getLibrary(project: string): Promise<{ style: string; entries: LibraryEntry[] }> {
  return (await axios.get(`${await base(project)}/library`)).data;
}

export async function updateLibraryEntry(project: string, source: string, fields: Record<string, unknown>) {
  return (await axios.put(`${await base(project)}/library/${encodeURIComponent(source)}`, fields)).data;
}

export async function setCitationStyle(project: string, style: string) {
  return (await axios.put(`${await base(project)}/style`, { style })).data;
}

export async function getReferences(project: string): Promise<{ style: string; markdown: string }> {
  return (await axios.get(`${await base(project)}/references`)).data;
}

export async function downloadBibtex(project: string): Promise<void> {
  const response = await axios.get(`${await base(project)}/bibtex`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project}.bib`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function listResults(project: string): Promise<ResultsFile[]> {
  return (await axios.get(`${await base(project)}/results`)).data.files;
}

export async function uploadResults(project: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return (await axios.post(`${await base(project)}/results`, formData)).data;
}

export async function deleteResults(project: string, fileName: string) {
  return (await axios.delete(`${await base(project)}/results/${encodeURIComponent(fileName)}`)).data;
}

// Article writing (one draft per project, section by section)
export interface ArticleSection {
  id: string;
  title: string;
  goal: string;
  notes: string;
  words: number;
  use_sources: boolean;
  draft: string;
  sources: Source[];
  generated?: { at: string; model: string; style: string; used: number[]; dropped: string[]; mode?: 'draft' | 'continue' };
}

export type Severity = 'critico' | 'importante' | 'sugestao';

export interface ReviewIssue {
  gravidade: Severity;
  categoria: string;
  secao: string;
  secao_id: string | null;
  trecho: string;
  problema: string;
  sugestao: string;
  origem: 'verificacao' | 'revisor';
  id: string;
  correcao: 'texto' | 'biblioteca' | 'manual'; // where the fix happens
  dica: string;
  status?: 'corrigido' | 'ignorado';
}

export interface ArticleReview {
  at: string;
  model: string;
  hash: string;
  summary: string;
  scores: Record<string, number>;
  issues: ReviewIssue[];
  counts: Record<Severity, number>;
  stale?: boolean;
}

export interface Article {
  title: string;
  template: string;
  sections: ArticleSection[];
  updated: string;
  writing_model?: string;
  review_model?: string;
  review?: ArticleReview;
  review_stale?: boolean;
}

export async function getArticle(project: string): Promise<Article> {
  return (await axios.get(`${await base(project)}/article`)).data;
}

export async function saveArticle(project: string, article: Pick<Article, 'title' | 'sections'>): Promise<Article> {
  return (await axios.put(`${await base(project)}/article`, article)).data;
}

export async function resetArticle(project: string, title: string, template: 'vazio' | 'padrao'): Promise<Article> {
  return (await axios.post(`${await base(project)}/article/reset`, { title, template })).data;
}

export async function generateSection(project: string, sectionId: string): Promise<ArticleSection> {
  const url = `${await base(project)}/article/sections/${encodeURIComponent(sectionId)}/generate`;
  return (await axios.post(url)).data;
}

export async function continueSection(project: string, sectionId: string, instruction: string, words: number): Promise<ArticleSection> {
  const url = `${await base(project)}/article/sections/${encodeURIComponent(sectionId)}/continue`;
  return (await axios.post(url, { instruction, words })).data;
}

export async function downloadArticle(project: string, format: 'md' | 'docx' | 'tex'): Promise<void> {
  const response = await axios.get(`${await base(project)}/article/export`, { params: { format }, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = format === 'tex' ? `${project}-artigo-latex.zip` : `${project}-artigo.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ImportPreview {
  file_name: string;
  title: string;
  sections: { title: string; markdown: string; words: number; tables: number }[];
}

export async function importArticleDocument(project: string, file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return (await axios.post(`${await base(project)}/article/import`, formData)).data;
}

export async function reviewArticle(project: string): Promise<ArticleReview> {
  return (await axios.post(`${await base(project)}/article/review`)).data;
}

export interface DiffBlock {
  type: 'same' | 'changed' | 'added' | 'removed';
  count?: number;
  segments?: { op: 'same' | 'del' | 'add'; text: string }[];
}

export interface RevisionProposal {
  section_id: string;
  title: string;
  before: string;
  after: string;
  sources: Source[];
  issue_ids: string[];
  diff: DiffBlock[];
  warnings: string[];
  model: string;
}

export async function reviseArticle(project: string, issueIds: string[]): Promise<{ proposals: RevisionProposal[]; errors: { section_id: string; error: string }[] }> {
  return (await axios.post(`${await base(project)}/article/revise`, { issue_ids: issueIds })).data;
}

export async function applyRevision(project: string, proposal: RevisionProposal): Promise<Article> {
  const { section_id, after, sources, issue_ids } = proposal;
  return (await axios.post(`${await base(project)}/article/revise/apply`, { section_id, draft: after, sources, issue_ids })).data;
}

export async function setIssueStatus(project: string, issueIds: string[], status: 'corrigido' | 'ignorado' | null): Promise<ArticleReview> {
  return (await axios.put(`${await base(project)}/article/review/status`, { issue_ids: issueIds, status })).data;
}
