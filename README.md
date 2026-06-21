# Sistema Fitness

Aplicacao web responsiva para organizar treinos, alimentacao, evolucao corporal e habitos em um unico ambiente.

## Recursos

- Avaliacao inicial e definicao de objetivos
- Planejamento de treinos e alimentacao
- Registro de evolucao, hidratacao, sono e rotina
- Relatorios e materiais em PDF
- Areas separadas para alunos e administradores
- Integracoes de pagamento e e-mail

## Tecnologias

- Next.js, React e TypeScript
- PostgreSQL e Prisma
- Tailwind CSS
- Docker e Nginx

## Desenvolvimento

Use o arquivo `.env.example` somente como referencia e mantenha credenciais reais fora do repositorio.

```bash
npm ci
npm run db:generate
npm run dev
```

Antes de publicar alteracoes, execute:

```bash
npm run lint
npm test
npm run build
```

As bases de conteudo, dados pessoais, arquivos privados, credenciais e backups nao fazem parte deste repositorio.

## Direitos

Projeto demonstrativo. Todos os direitos reservados.
