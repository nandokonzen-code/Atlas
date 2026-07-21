# PRIORIZA Comercial — Demonstração pública

Demonstração pública segura do PRIORIZA Comercial.

> Observação: o repositório mantém temporariamente o slug legado `Atlas`, mas a identidade ativa da demonstração é **PRIORIZA Comercial**.

## Recursos

- avaliação individual de prospects;
- portões de elegibilidade;
- pontuação explicada de 0 a 100;
- faixas de prioridade e próxima ação;
- importação e ranking por CSV;
- preparação de roteiro de Discovery consultivo;
- perguntas SPIN + BBE;
- separação entre fatos confirmados e hipóteses;
- revisão humana obrigatória antes de qualquer ação externa.

## Acessar

https://nandokonzen-code.github.io/Atlas/

## Segurança dos dados

Esta versão pública usa somente informações públicas, sintéticas ou anonimizadas.

Não inserir:

- nomes ou contatos de clientes;
- propostas, contratos ou valores confidenciais;
- credenciais e chaves;
- listas comerciais internas;
- pipeline ou situação comercial interna;
- documentos recebidos sob confidencialidade.

O processamento ocorre somente no navegador e nenhuma avaliação é salva pela demonstração.

## Arquitetura

A versão pública é uma vitrine segura do método e não replica a camada privada de trabalho comercial.

- `index.html` — interface pública do PRIORIZA;
- `app.js` — priorização e ranking;
- `src/prioritizer.js` — motor de pontuação;
- `src/csv.js` — análise em lote;
- `src/discovery.js` — geração de Discovery consultivo;
- `discovery-ui.js` — interface do roteiro de Discovery.

## Executar localmente

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`.

## Testar

Requer Node.js 20 ou superior:

```bash
npm test
```

## Licença

Todos os direitos reservados. Consulte [LICENSE.md](LICENSE.md).
