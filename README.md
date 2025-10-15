# IP Calculator

A TypeScript application that calculates and displays detailed information about IP ranges based on an input IP address and subnet mask.

## Features

- Calculate network address from IP and subnet mask
- Display broadcast address
- Show usable host range
- Calculate total number of hosts
- Support for both dotted decimal notation (e.g., 255.255.255.0) and CIDR notation (e.g., /24)
- Real-time calculation as you type
- Clean, responsive user interface

## Technology Stack

- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **NGINX** - Production web server

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- NGINX (for production deployment)

### Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser at `http://localhost:3000`

### Production Build

Build the application for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment with NGINX

### Local NGINX Installation

1. Build the application:
```bash
npm run build
```

2. Copy the built files to your NGINX web root:
```bash
sudo cp -r dist/* /usr/share/nginx/html/
```

3. Copy the NGINX configuration:
```bash
sudo cp nginx.conf /etc/nginx/conf.d/ipcalc.conf
```

4. Restart NGINX:
```bash
sudo systemctl restart nginx
```

Access the application at `http://localhost`

## Usage

1. Enter an IP address (e.g., `192.168.1.100`)
2. Enter a subnet mask in either format:
   - Dotted decimal: `255.255.255.0`
   - CIDR notation: `/24`
3. View the calculated results:
   - Network Address
   - Broadcast Address
   - Host Range (first usable to last usable IP)
   - Total Hosts

## Project Structure

```
ipcalc2/
├── src/
│   ├── App.vue          # Main application component
│   └── main.ts          # Application entry point
├── dist/                # Production build output
├── index.html           # HTML entry point
├── nginx.conf           # NGINX configuration
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite build configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checking

## License

MIT
