# Plano — Caderneto Digital

## Objetivo e decisões

Criar um app Android pessoal chamado **Caderneto Digital**, preservando a base instalada Expo/React Native/TypeScript. O código-fonte pode ficar público no Git, conforme autorização da usuária; notas, capas escolhidas da galeria, preferências e backups permanecem dados pessoais e não serão gravados no repositório. O app não será publicado publicamente por esta tarefa.

A primeira entrega prioriza a introdução e um caderno digital utilizável: estante, hierarquia de cadernos/subpastas sem limite artificial de níveis ou quantidade de itens, busca/lista de notas, editor, calendário e preferências. O armazenamento primário será local no dispositivo para funcionar offline. A sincronização Gmail/Google Drive ficará separada por conta e só será anunciada como ativa depois de implementar e validar OAuth e acesso ao Drive; esses serviços exigem configuração de OAuth do Google que ainda não está disponível no projeto. Serão oferecidos caminhos locais de backup/exportação e restauração onde a plataforma permitir. A capacidade prática será limitada pelo armazenamento do aparelho, não por um teto imposto pelo app.

## Abordagem de implementação

- Reaproveitar o starter Expo Router em `app/`, manter a API/runtime existentes sem fazer chamadas de rede desnecessárias e registrar o app como Caderneto Digital nos metadados já presentes em `app.config.ts`.
- Implementar persistência privada e offline com SQLite via `expo-sqlite` no Android e, apenas para a prévia web, armazenamento isolado em localStorage, usando resolução de módulos por plataforma (`database.ts` e `database.web.ts`). Guardar fotos/áudios como arquivos no sandbox Android e somente caminhos/metadata no SQLite; a prévia web usa data URIs locais. Não incorporar mídia pessoal ao Git.
- Manter IDs estáveis, relação `parentId` para níveis ilimitados, campo de posição para ordenação manual e relações de nota com caderno. Operações de excluir, arquivar e lixeira serão distintas para reduzir perda acidental.
- Usar componentes Expo/React Native compatíveis com a base. Preferências da interface são locais; recursos que exigem compilação nativa serão indicados de forma clara. A fonte usa a família arredondada nativa do Android e `system-ui` no navegador para evitar fallback serifado.
- Implementar login Google/Drive como integração opcional separada, usando OAuth público para aplicativo nativo e autorização restrita aos arquivos/pasta de backup do próprio app. Não incluir client secrets, tokens, notas, dados de login ou arquivos pessoais em código público. Solicitar configuração OAuth por fluxo protegido quando a implementação chegar a essa etapa; até então, não simular login nem afirmar que a nuvem está sincronizando.
- Produzir PDF/imagem/compartilhamento por conteúdo local e APIs suportadas. Se algum recurso como ditado, atalhos Android, widgets da tela inicial ou biometria depender de um build nativo ou permissão de aparelho, preservar o fallback apropriado e informar o estado real.

## Estrutura prevista

- `app/(tabs)/index.tsx`: entrada principal e navegação de cinco destinos, integrando a introdução na primeira execução.
- `components/caderneto/`: estante, cartão de caderno, lista de notas, editor, calendário, folha de configurações, diálogos e barras de ações.
- `lib/caderneto/types.ts`: tipos e modelo de caderno, nota, anexo, configuração e evento.
- `lib/caderneto/database.ts` e `database.web.ts`: backends de persistência por plataforma (SQLite local no Android; localStorage somente na prévia web); notas guardam também formatação individual.
- `lib/caderneto/date.ts`: formatar datas e agrupar dias no fuso configurado.
- `lib/caderneto/media.ts` e `media.web.ts`: guardar/restaurar capas e anexos como arquivos privados no Android ou data URI local para a prévia web.
- `lib/caderneto/google-drive.ts`: formar snapshots para exportação/importação local e, depois de OAuth autorizado, backup/restauração na área privada do Google Drive.
- `assets/images/`: identidade nativa própria e recursos pequenos; nenhuma arte do app Mind Notes será copiada.
- `assets/audio/`: breve efeito original da introdução, reproduzido no volume solicitado dentro do app, respeitando o volume/silêncio do aparelho.

## Design e identidade

**Movimento:** papelaria contemporânea e cadernos pessoais, reinterpretados como estante digital; usar a imagem enviada como referência de organização, não copiar arte ou marca do aplicativo de terceiros.

**Princípios:** leitura ampla e confortável; cadernos imediatamente reconhecíveis pelas capas; ações acessíveis por toque e pressionamento longo; privacidade e salvamento local como padrões.

**Filosofia de cor:** fundo branco e texto preto como padrão solicitado, cinzas discretos para separar controles e rosa suave como cor própria de destaque, ligada à frase de abertura. O modo escuro será uma preferência independente.

**Paradigma de layout:** estante com cadernos lado a lado e cartões de criação no início; abas persistentes na base para Notas, Estante, criação, Calendário e Meu. O editor reserva o centro para escrever e deixa as ferramentas numa barra inferior rolável.

**Elementos de assinatura:** capas fotográficas escolhidas pela usuária; lombadas/cartões com recorte de livro e pequeno detalhe rosa; marca de caderno aberto desenhada para o próprio app.

**Interação:** tocar abre; pressionar e segurar revela ações; “Ordenar” ativa arraste com retorno visual e possibilidade de mover primeiro/último; confirmar exclusões; autosave local e botão explícito para concluir edição.

**Animação:** entrada curta com contador crescente até 100%, indicador de carregamento e pequeno toque suave, com opção de silenciar e sem tentar elevar o volume físico do telefone. Transições de abas leves; evitar movimento contínuo após a intro.

**Tipografia:** família arredondada do sistema Android (`sans-serif-rounded`) e equivalentes de sistema nos demais alvos, tamanhos acima do padrão para títulos e corpo. Hierarquia consistente para título, rótulo e metadados.

**Essência:** um lugar privado para os cadernos do dia a dia, fácil de organizar e confortável de ler; personalidade acolhedora, clara e prática.

**Voz:** títulos e mensagens diretos, gentis e curtos. Exemplos: “Abrir meu caderno.” e “Suas notas ficam no seu aparelho até você escolher sincronizar.”

**Wordmark/ícone:** livro aberto com duas folhas arredondadas, uma folha em rosa e um marcador vertical, sem imitar o ícone da referência.

**Cor de marca:** rosa suave `#F2AFC3`, sempre combinado ao fundo branco e ao texto escuro.

## Escopo funcional aprovado

- Intro com “Suas mãos Merecem Descanso 🩷.” e “Engenheira e Arquiteta de Software Rafaela Abreu”, contador de carga, efeito sonoro de carregamento e volume máximo ajustado dentro do app, sem sobrepor as configurações físicas do dispositivo.
- Estante com cadernos lado a lado, capa escolhida da galeria, título personalizável, criação pelo primeiro cartão “+”, cadernos/subpastas aninhadas, criação de subpastas, pressão longa para trocar capa/renomear/duplicar/ordenar/excluir e ordenação por arraste manual.
- Abas inferiores Notas, Estante, “+”, Calendário e Meu. Lista rápida de notas de todos os cadernos, contador de notas e calendário com fuso de Brasília por padrão e seleção de outros fusos/relógios mundiais.
- Editor com título/pasta, salvamento, desfazer/refazer, compartilhar, estilos e cores, listas com marcadores e numeradas, checklist, ditado, imagem, desenho, tabela/grade, lembrete, fixação, atalho, cadeado, exportação PDF, favorito, arquivamento e lixeira. Compartilhamento em texto, imagem ou PDF.
- Preferências para idioma, notificações, cadeado/alterar PIN/biometria quando suportada, claro/escuro, colar da área de transferência, formato de data/hora e primeiro dia da semana.
- Entrar/sair da conta Google e backup/restauração em Drive, com isolamento por conta, condicionado às credenciais/configurações OAuth e permissões do Google.

## Dependências e limites materiais

A base já tem React Native, Expo Router, TypeScript, armazenamento assíncrono, Expo Audio, Expo Notifications, SecureStore e gestos; o diagnóstico TypeScript já está registrado. A instalação de extensões Expo será feita pelo gerenciador do projeto e validada com `pnpm check`. O Android real pode exigir permissões do usuário e build nativo para selecionar mídia, gravar áudio, notificações, biometria e atalhos. Google OAuth/Drive não está conectado; seus identificadores e consentimento serão necessários para validar login e backup. Não prometer recuperação infalível nem limite físico ilimitado de dados. Não substituir o app base nem expor notas no Git.
