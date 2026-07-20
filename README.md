# ATLAS Comercial — Demonstração pública

Demonstração do priorizador de prospects do ATLAS Comercial.

## Recursos

- avaliação individual;
- importação de CSV;
- ranking de prospects;
- portões de elegibilidade;
- pontuação explicada de 0 a 100;
- faixas de prioridade e próxima ação;
- testes automatizados.

## Acessar

Após a ativação do GitHub Pages:

https://nandokonzen-code.github.io/Atlas/

## Ativação gratuita do GitHub Pages

1. Abrir [Settings → Pages](https://github.com/nandokonzen-code/Atlas/settings/pages).
2. Em **Build and deployment → Source**, selecionar **Deploy from a branch**.
3. Em **Branch**, escolher `main`, pasta `/(root)` e tocar em **Save**.

O GitHub publicará automaticamente as atualizações da branch principal.

## Segurança dos dados

Esta versão pública deve usar somente informações públicas, sintéticas ou anonimizadas.

Não inserir:

- nomes ou contatos de clientes;
- propostas, contratos ou valores confidenciais;
- credenciais e chaves;
- listas comerciais internas;
- documentos recebidos sob confidencialidade.

O processamento ocorre somente no navegador e nenhuma avaliação é salva.

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
