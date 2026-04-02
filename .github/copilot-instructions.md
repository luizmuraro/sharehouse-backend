# Share House — Backend Copilot Instructions

## Visão Geral
API REST para o app House Share (ShareHouse). Gerencia usuários, despesas compartilhadas e lista de compras de um casal/dupla de parceiros.

## Tech Stack
- **NestJS 10** + **TypeScript 5**
- **MongoDB** via **Mongoose** (TypeScript Mongoose, não @nestjs/mongoose typegoose)
- **@nestjs/mongoose** para integração oficial
- **class-validator** + **class-transformer** para DTOs e validação
- **@nestjs/jwt** + **passport-jwt** para autenticação
- **bcrypt** para hash de senhas
- **Zod** apenas para validação de env vars (config module)
- Deploy: **Railway** ou **Render** (Node.js server)
- Banco: **MongoDB Atlas** (free tier M0)

## Regras de Código
- **Módulos NestJS** por domínio: um módulo por feature (auth, users, household, expenses, shopping)
- **Um arquivo por responsabilidade**: controller, service, schema, dto separados
- **Tipagem estrita**: sem `any`. Props com interfaces/types ou classes DTO
- **Nomes em inglês**: variáveis, funções, arquivos
- **Comentários explicativos em português**: para facilitar aprendizado
- **Respostas padronizadas**:
  - Sucesso: `{ success: true, data: {...} }`
  - Erro: `{ success: false, message: "...", statusCode: 400 }`
- **Senhas** NUNCA retornadas nas respostas (usar `@Exclude()` no serializer)
- Todos os endpoints protegidos por `JwtAuthGuard` exceto `/auth/login` e `/auth/register`
- Rotas prefixadas com `/api`

## Estrutura de Pastas
```
src/
  app.module.ts
  main.ts
  config/
    configuration.ts        ← variáveis de ambiente tipadas
    env.validation.ts       ← Zod schema para validar .env
  common/
    decorators/
      current-user.decorator.ts
    filters/
      http-exception.filter.ts
    guards/
      jwt-auth.guard.ts
    interceptors/
      transform.interceptor.ts  ← formata respostas { success, data }
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      dto/
        login.dto.ts
        register.dto.ts
      strategies/
        jwt.strategy.ts
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      schemas/
        user.schema.ts
      dto/
        update-user.dto.ts
    household/
      household.module.ts
      household.controller.ts
      household.service.ts
      schemas/
        household.schema.ts
      dto/
        create-household.dto.ts
        join-household.dto.ts
    expenses/
      expenses.module.ts
      expenses.controller.ts
      expenses.service.ts
      schemas/
        expense.schema.ts
      dto/
        create-expense.dto.ts
        update-expense.dto.ts
        expense-query.dto.ts
    shopping/
      shopping.module.ts
      shopping.controller.ts
      shopping.service.ts
      schemas/
        shopping-item.schema.ts
      dto/
        create-shopping-item.dto.ts
        update-shopping-item.dto.ts
  database/
    database.module.ts
```

## Schemas Mongoose

### User
```typescript
{
  name: string           // nome do usuário
  email: string          // único, lowercase
  password: string       // bcrypt hash
  householdId: ObjectId  // ref: Household (nullable até o usuário entrar em um household)
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### Household
```typescript
{
  name: string           // ex: "Ap do Muraro"
  members: ObjectId[]    // ref: User, máximo 2
  inviteCode: string     // código único de 6 chars para o parceiro entrar
  createdAt: Date
}
```

### Expense
```typescript
{
  householdId: ObjectId  // ref: Household
  description: string
  amount: number         // em centavos BRL (ex: R$ 12,50 = 1250)
  category: enum         // 'alimentacao' | 'moradia' | 'transporte' | 'saude' | 'lazer' | 'outros'
  paidBy: ObjectId       // ref: User
  splitRatio: number     // 0–1, proporção do paidBy (0.5 = 50/50)
  date: Date
  receiptUrl?: string
  createdAt: Date
}
```

### ShoppingItem
```typescript
{
  householdId: ObjectId  // ref: Household
  name: string
  quantity: number
  unit: string           // ex: 'kg', 'un', 'L'
  checked: boolean
  addedBy: ObjectId      // ref: User
  createdAt: Date
}
```

## Endpoints

### Auth
- `POST /api/auth/register` — cria usuário, retorna JWT
- `POST /api/auth/login` — retorna JWT
- `GET  /api/auth/me` — retorna usuário autenticado (protegido)

### Users
- `GET    /api/users/me` — perfil do usuário logado
- `PATCH  /api/users/me` — atualiza nome/avatar

### Household
- `POST /api/household` — cria um novo household
- `GET  /api/household` — retorna o household do usuário logado
- `POST /api/household/invite` — gera/retorna o inviteCode
- `POST /api/household/join` — entra no household via `{ inviteCode }`

### Expenses
- `GET    /api/expenses` — lista (query: category, month, year, paidBy)
- `POST   /api/expenses` — cria despesa
- `GET    /api/expenses/summary` — saldo: quanto cada um deve ao outro
- `GET    /api/expenses/:id` — detalhe
- `PATCH  /api/expenses/:id` — atualiza
- `DELETE /api/expenses/:id` — remove

### Shopping
- `GET    /api/shopping` — lista todos os itens
- `POST   /api/shopping` — adiciona item
- `PATCH  /api/shopping/:id` — edita item (nome, qty, checked)
- `DELETE /api/shopping/:id` — remove item
- `DELETE /api/shopping/checked` — remove todos os checked

## Variáveis de Ambiente (.env)
```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=sua-chave-secreta
JWT_EXPIRES_IN=7d
BCRYPT_SALT=10
FRONTEND_URL=http://localhost:5173
```

## Segurança
- Helmet (headers de segurança)
- CORS configurável via `FRONTEND_URL`
- Rate limiting com `@nestjs/throttler`
- Todas as rotas validam que o `householdId` do usuário autenticado bate com o recurso solicitado (não deixar um usuário acessar dados de outro household)

## Development Instructions

### Explanations
- After generating each file or module, write a dedicated explanation block in Portuguese (Brasil) as a response — NOT as code comments
- The explanation must cover: what was built, why this NestJS pattern was chosen, and what to watch out for
- When a NestJS pattern appears for the first time (e.g. `@InjectModel`, `PassportStrategy`, `@UseGuards`), explain the concept in depth in the response before moving on
- Build one complete module at a time: schema → dto → service → controller → module registration

### Code Comments
- All inline comments inside code files must be in English
- Only comment non-obvious logic (e.g. a complex Mongoose aggregation, a subtle guard behavior)
- Do NOT comment obvious lines like `return this.userService.findById(id)`

### Git Workflow
- After completing each logical unit of work, create the commit automatically using conventional commits:
  `type(scope): short description`
  Types: `feat`, `fix`, `refactor`, `chore`, `docs`
  Example: `feat(auth): add JWT strategy and login endpoint`
- Default flow for each logical unit:
  0. Create or switch to a feature branch before coding (never commit directly to `main`)
  1. Run validations/tests related to the change
  2. Stage files (`git add ...`)
  3. Commit automatically with a conventional message
  4. Push the feature branch to origin
- At the end of each module (auth, household, expenses, shopping), open a Pull Request directly from terminal using GitHub CLI (`gh pr create`) with:
  - A clear PR title
  - A short module summary
  - A checklist of what was implemented
  - Follow-up tasks or known limitations
- If `gh` is not installed or not authenticated, provide exact setup commands and then proceed with PR creation right after setup.
- Do not wait for manual commit/PR prompts unless explicitly requested by the user.
