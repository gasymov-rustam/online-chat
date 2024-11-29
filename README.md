# Chat Application

Real-time chat application built with .NET 8 and React.

## Project Structure

```
ChatApp/
├── backend/              # Backend solution (.NET 8)
│   ├── ChatApp.Domain/         # Domain layer
│   ├── ChatApp.Application/    # Application layer
│   ├── ChatApp.Infrastructure/ # Infrastructure layer
│   └── ChatApp.WebAPI/         # API layer
│
└── client/               # Frontend application (React + Vite)
    ├── src/
    │   ├── app/         # Application initialization
    │   ├── processes/   # Complex processes
    │   ├── pages/       # Application pages
    │   ├── widgets/     # Complex components
    │   ├── features/    # Business features
    │   ├── entities/    # Business entities
    │   └── shared/      # Shared code
    └── public/          # Static files
```

## Technologies

### Backend
- .NET 8
- Clean Architecture
- Entity Framework Core
- SignalR for real-time communication

### Frontend
- React 18
- TypeScript
- Vite
- Feature-Sliced Design
- Preact Signals for state management

## Development

### Backend
1. Navigate to the backend directory:
```bash
cd backend
```

2. Run the API:
```bash
dotnet run --project ChatApp.WebAPI
```

### Frontend
1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

## Building for Production

### Backend
```bash
cd backend
dotnet publish -c Release
```

### Frontend
```bash
cd client
npm run build
```
