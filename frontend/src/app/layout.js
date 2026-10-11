import './globals.css';
import { WalletProvider } from '../context/WalletContext';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Decentralized IP Provenance & Licensing System',
  description: 'Tamper-evident registration, verification, and licensing of digital creative works on EVM blockchain with off-chain IPFS storage.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <WalletProvider>
          <div className="app-wrapper">
            <Navbar />
            {children}
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
