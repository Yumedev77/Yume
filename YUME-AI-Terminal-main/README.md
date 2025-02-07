# YUMEAI - AI Chat Assistant




YUMEAI is a modern, responsive AI chat assistant built with React, TypeScript, and Supabase. It provides a seamless conversational interface with a beautiful, minimalist design.

Visit: https://YUMEi.app

## Features

- 🤖 Real-time AI chat interactions
- 🔐 Secure authentication system
- 💾 Persistent conversation history - AI -Memory
- 📱 Responsive design for all devices
- 🎨 Beautiful, modern UI with animations
- 🌙 Clean, minimalist interface
- 🔄 Real-time message synchronization
- 📝 Conversation management
- 🎯 Message copy functionality

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend/Database**: Supabase
- **Build Tool**: Vite
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YUMEinfrastructure/YUME-AI-Terminal
cd YUMEAI
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
YUMEAI/
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utility functions and services
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
└── supabase/         # Supabase migrations and configurations
```

## Features in Detail

### Authentication
- Email/password authentication
- Protected routes and data
- Secure session management

### Conversations
- Real-time message updates
- Conversation history
- Message deletion
- Copy message functionality
- Minimizable sidebar

### UI/UX
- Responsive design for all screen sizes
- Smooth animations and transitions
- Loading states and error handling
- Clean and intuitive interface

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes 
4. Push to the branch 
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Vite](https://vitejs.dev/)
