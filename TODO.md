# TODO — Caderneto Digital

Status desta versão: **prévia web compilada e observada em viewport mobile; TypeScript/lint passaram.** O build e o teste em aparelho Android ainda não foram executados. Login/Drive continuam aguardando IDs OAuth válidos do Google.

## 1. Introdução, identidade e aparência principal
- [x] Mostrar na intro o texto exato “Suas mãos Merecem Descanso 🩷.” e a assinatura “Engenheira e Arquiteta de Software Rafaela Abreu”.
- [x] Exibir indicador de carregamento com número que progride até 100%; tocar um som suave de carregamento no volume máximo definido pelo app, respeitando silêncio/volume físico do aparelho. O progresso, animação e áudio foram revisados no código; a prévia visual mostrou a intro em progresso.
- [x] Depois da intro, abrir a interface branca com texto preto, fonte arredondada e relativamente grande; oferecer modo claro e escuro nas definições. A fonte nativa é arredondada; a prévia web usa system-ui para manter aparência sem serifa.
- [x] A identidade (nome, ícone e telas) deve ser própria do Caderneto Digital; a imagem enviada pode orientar a estrutura, mas marcas e materiais gráficos de terceiros não serão copiados.

## 2. Estante, cadernos e subpastas
- [x] A tela central de Estante mostra cadernos lado a lado como livros, com capa e título personalizáveis; a capa pode ser escolhida diretamente da galeria.
- [x] O primeiro cartão da estante cria caderno; dentro de um caderno, o primeiro cartão cria subpasta. Cadernos podem conter subpastas aninhadas sem limite artificial imposto pelo app.
- [x] Ao tocar e segurar um caderno, oferecer alterar capa, alterar/renomear nome, duplicar, ordenar, excluir. A ordenação manual permite arrastar e mover cada caderno para outra posição, inclusive primeiro ou último.
- [x] Subpastas têm título e capa próprios. Operações de exclusão devem pedir confirmação; arquivamento e lixeira de notas não devem se confundir com exclusão permanente.

## 3. Abas e lista geral de notas
- [x] A barra inferior contém, nesta ordem funcional: Notas, Estante, botão central “+”, Calendário e Meu.
- [x] Notas mostra rapidamente notas de todos os cadernos/subpastas; incluir busca, ordenação e contagem visível de notas.
- [x] O botão central “+” cria um caderno ou nota, respeitando o contexto atual e oferecendo escolha quando houver mais de uma possibilidade.

## 4. Editor, ações da nota e compartilhamento
- [ ] No editor, permitir salvar e fechar, desfazer/refazer, compartilhar, editar data/hora/título e mudar a pasta/caderno da nota. Salvamento, histórico, título, lembrete e mudança de caderno existem; a edição direta da data/hora de modificação/metadados não está concluída.
- [ ] A barra inferior do editor oferece formatação de fonte e cor, lista com marcadores, lista numerada, checklist, ditado, imagem da galeria, desenho livre e inserção de tabela/grade. Estilo persistente, listas, imagens, desenho, tabela e anexos de áudio estão implementados; ditado usa o microfone do teclado do aparelho, sem gravação/conversão de fala própria do app.
- [ ] O menu de opções da nota oferece lembrete, fixar, atalho para tela inicial quando suportado, fechadura por senha/biometria quando suportado, exportar para PDF, favoritar, arquivar e enviar à lixeira. Lembrete, fixação, PIN, PDF, favoritos, arquivo e lixeira existem; atalho Android é apenas um aviso e depende de implementação/build nativo.
- [x] O compartilhamento permite texto puro, imagem e PDF.
- [x] Guardar fotos/áudios/anexos no armazenamento privado do aparelho ou num provedor configurado; não versionar mídia privada no Git. Android usa diretório privado do aplicativo; preview web usa data URIs locais.

## 5. Calendário e fusos
- [x] A aba Calendário exibe e permite localizar notas por data, com Brasília/DF como fuso inicial e seleção de outros fusos horários/relógios mundiais.
- [x] Respeitar as preferências de formato de data/hora e primeiro dia da semana. Horários são calculados localmente usando os fusos disponíveis; não fingir que existe atualização de serviço de terceiros se não houver rede.

## 6. Meu, preferências e bloqueio
- [x] A aba Meu apresenta conta/sincronização, quantidade de notas e entrada para as definições.
- [x] Definições permitem selecionar idioma, ativar/desativar notificações, ativar/desativar bloqueio/trocar PIN e biometria quando o aparelho suportar, escolher claro/escuro, colar conteúdo da área de transferência, configurar formato de data/hora e início da semana. A tradução atual cobre principalmente rótulos das abas; revisão completa de todos os textos em cada idioma ainda pode ser ampliada.
- [x] A tela de bloqueio mantém notas locais inacessíveis na interface até a autenticação configurada; não armazenar senha em texto puro. PIN Android usa SecureStore; listas, busca e calendário ocultam o conteúdo de notas trancadas.

## 7. Persistência local, conta Google e backup privado
- [ ] Cadernos, notas e preferências persistem ao fechar/reabrir o app e funcionam sem conexão à internet. Implementado com SQLite no Android e localStorage na prévia web; a persistência nativa precisa de confirmação em um aparelho Android.
- [ ] Dados de cada conta Google devem ficar isolados; oferecer login, logout, troca de conta e backup/restauração em Google Drive depois de configurar e validar OAuth. Código do fluxo e da área privada do Drive está preparado, mas os OAuth Client IDs do Google não estão configurados nesta versão.
- [ ] Não incorporar credenciais, tokens OAuth ou dados pessoais ao código público do Git. Até configurar a integração, não exibir falso estado de sincronização; disponibilizar exportação/importação local quando possível e indicar claramente a ausência de backup em nuvem. O app indica a pendência de OAuth e inclui importação/exportação local.
- [ ] Não afirmar que os dados nunca podem ser perdidos; informar quando o backup foi concluído e permitir restauração do arquivo correspondente.
