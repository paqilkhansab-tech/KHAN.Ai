// Baseline market data used when live APIs are unreachable.
// Prices are realistic reference values; live route overrides them whenever CoinGecko responds.

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  about: string;
  tags: string[];
}

export const CRYPTO_BASELINES: CryptoAsset[] = [
  {
    id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: '/crypto/btc.svg',
    price: 103250, change24h: 2.1, marketCap: 2040000000000, volume24h: 48500000000, rank: 1,
    about: 'The original cryptocurrency. Created in 2009 by the pseudonymous Satoshi Nakamoto, Bitcoin runs on a fixed supply of 21 million coins and the most secure proof-of-work network in the world. It is regarded as digital gold and the primary store-of-value asset in crypto.',
    tags: ['Store of value', 'Digital gold', 'Proof of work'],
  },
  {
    id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: '/crypto/eth.svg',
    price: 3980, change24h: 3.4, marketCap: 480000000000, volume24h: 24800000000, rank: 2,
    about: 'The world computer. Ethereum pioneered smart contracts and hosts the majority of DeFi, NFTs and stablecoin volume. It switched to energy-efficient proof-of-stake in 2022 and burns part of every transaction fee, making ETH deflationary in high-demand periods.',
    tags: ['Smart contracts', 'DeFi', 'Proof of stake'],
  },
  {
    id: 'tether', symbol: 'usdt', name: 'Tether', image: '/crypto/usdt.svg',
    price: 1.0, change24h: 0.01, marketCap: 168000000000, volume24h: 72500000000, rank: 3,
    about: 'The largest US dollar stablecoin. USDT maintains a 1:1 peg to the dollar and is the main trading pair across global crypto exchanges, used to move value and park funds between trades.',
    tags: ['Stablecoin', 'US dollar', 'Trading pair'],
  },
  {
    id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: '/crypto/bnb.svg',
    price: 985, change24h: 1.6, marketCap: 140000000000, volume24h: 2100000000, rank: 4,
    about: 'The utility token of the BNB Chain ecosystem and the Binance exchange. BNB pays for transaction fees, unlocks trading discounts and powers a large DeFi and gaming ecosystem.',
    tags: ['Exchange token', 'DeFi', 'Gaming'],
  },
  {
    id: 'solana', symbol: 'sol', name: 'Solana', image: '/crypto/sol.svg',
    price: 248, change24h: 4.8, marketCap: 118000000000, volume24h: 5200000000, rank: 5,
    about: 'The high-performance blockchain. Solana processes thousands of transactions per second with sub-cent fees, making it a hub for DeFi, DePIN, payments and consumer apps. Known for speed and a fast-growing developer ecosystem.',
    tags: ['High speed', 'Low fees', 'DeFi'],
  },
  {
    id: 'ripple', symbol: 'xrp', name: 'XRP', image: '/crypto/xrp.svg',
    price: 2.65, change24h: -1.2, marketCap: 152000000000, volume24h: 4800000000, rank: 6,
    about: 'Built for cross-border payments. XRP settles international transfers in seconds at negligible cost, with adoption from banks and payment providers through RippleNet and RLUSD.',
    tags: ['Payments', 'Banking', 'Fast settlement'],
  },
  {
    id: 'cardano', symbol: 'ada', name: 'Cardano', image: '/crypto/ada.svg',
    price: 0.92, change24h: -0.8, marketCap: 33000000000, volume24h: 890000000, rank: 7,
    about: 'A research-driven, peer-reviewed blockchain founded by Ethereum co-founder Charles Hoskinson. Cardano focuses on security, sustainability and formal verification for smart contracts.',
    tags: ['Research', 'Proof of stake', 'Smart contracts'],
  },
  {
    id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: '/crypto/doge.svg',
    price: 0.21, change24h: 5.6, marketCap: 31000000000, volume24h: 1900000000, rank: 8,
    about: 'The original meme coin, created in 2013 as a joke, now a top-10 asset with a passionate community. Dogecoin is used for tips, payments and charity, and has been adopted by major brands.',
    tags: ['Meme', 'Community', 'Payments'],
  },
  {
    id: 'tron', symbol: 'trx', name: 'TRON', image: '/crypto/trx.svg',
    price: 0.31, change24h: 0.9, marketCap: 29000000000, volume24h: 780000000, rank: 9,
    about: 'A blockchain optimized for stablecoin transfers and decentralized content sharing. TRON carries some of the highest USDT transaction volume in the world.',
    tags: ['Stablecoins', 'Content', 'Low fees'],
  },
  {
    id: 'chainlink', symbol: 'link', name: 'Chainlink', image: '/crypto/link.svg',
    price: 22.4, change24h: 3.1, marketCap: 15000000000, volume24h: 640000000, rank: 10,
    about: 'The industry-standard oracle network. Chainlink feeds real-world data — prices, weather, sports — to smart contracts across every major blockchain and powers CCIP for cross-chain messaging.',
    tags: ['Oracles', 'DeFi infrastructure', 'Cross-chain'],
  },
  {
    id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', image: '/crypto/avax.svg',
    price: 38.6, change24h: 2.4, marketCap: 16000000000, volume24h: 520000000, rank: 11,
    about: 'A fast, eco-friendly Layer 1 with subnet architecture that lets institutions and developers launch their own customizable blockchains.',
    tags: ['Layer 1', 'Subnets', 'Institutional'],
  },
  {
    id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', image: '/crypto/shib.svg',
    price: 0.0000245, change24h: 4.2, marketCap: 14400000000, volume24h: 410000000, rank: 12,
    about: 'The Dogecoin-killer meme ecosystem that grew into Shibarium L2, DEX, NFTs and metaverse projects, driven by one of crypto\u2019s largest communities.',
    tags: ['Meme', 'Layer 2', 'Community'],
  },
  {
    id: 'polkadot', symbol: 'dot', name: 'Polkadot', image: '/crypto/dot.svg',
    price: 6.8, change24h: -0.5, marketCap: 10500000000, volume24h: 230000000, rank: 13,
    about: 'A multi-chain network connecting specialized blockchains called parachains, founded by Ethereum co-founder Gavin Wood, focused on interoperability and shared security.',
    tags: ['Interoperability', 'Parachains', 'Web3'],
  },
  {
    id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: '/crypto/ltc.svg',
    price: 118, change24h: 1.1, marketCap: 8900000000, volume24h: 460000000, rank: 14,
    about: 'The silver to Bitcoin\u2019s gold. Created in 2011 with faster 2.5-minute blocks, Litecoin remains a reliable, low-fee payments coin with widespread merchant support.',
    tags: ['Payments', 'Silver', 'Proof of work'],
  },
  {
    id: 'polygon', symbol: 'matic', name: 'Polygon', image: '/crypto/polygon.svg',
    price: 0.58, change24h: 2.9, marketCap: 5600000000, volume24h: 310000000, rank: 15,
    about: 'A leading Ethereum scaling ecosystem with zkEVM technology, used by brands like Starbucks, Nike and Disney for web3 experiences.',
    tags: ['Layer 2', 'zkEVM', 'Enterprise'],
  },
  {
    id: 'uniswap', symbol: 'uni', name: 'Uniswap', image: '/crypto/uni.svg',
    price: 14.2, change24h: 3.7, marketCap: 8500000000, volume24h: 290000000, rank: 16,
    about: 'The largest decentralized exchange. Uniswap\u2019s automated market maker lets anyone swap tokens without intermediaries, and UNI holders govern the protocol.',
    tags: ['DEX', 'DeFi', 'Governance'],
  },
  {
    id: 'internet-computer', symbol: 'icp', name: 'Internet Computer', image: '/crypto/icp.svg',
    price: 10.4, change24h: -1.8, marketCap: 5200000000, volume24h: 120000000, rank: 17,
    about: 'A blockchain that hosts fully on-chain applications and websites, aiming to rebuild the internet as a decentralized compute platform.',
    tags: ['Compute', 'Web3', 'On-chain apps'],
  },
  {
    id: 'near', symbol: 'near', name: 'NEAR Protocol', image: '/crypto/near.svg',
    price: 5.9, change24h: 2.2, marketCap: 5100000000, volume24h: 260000000, rank: 18,
    about: 'A user-friendly Layer 1 with sharding and chain abstraction, known for seamless onboarding and AI-focused blockchain initiatives.',
    tags: ['Sharding', 'AI', 'UX'],
  },
  {
    id: 'cosmos', symbol: 'atom', name: 'Cosmos', image: '/crypto/atom.svg',
    price: 4.6, change24h: -0.3, marketCap: 3600000000, volume24h: 140000000, rank: 19,
    about: 'The internet of blockchains. Cosmos SDK powers 100+ appchains and IBC enables native communication between sovereign networks.',
    tags: ['IBC', 'Appchains', 'Interop'],
  },
  {
    id: 'pepe', symbol: 'pepe', name: 'Pepe', image: '/crypto/pepe.svg',
    price: 0.0000112, change24h: 6.4, marketCap: 4700000000, volume24h: 980000000, rank: 20,
    about: 'The frog-powered meme phenomenon that became one of the most traded ERC-20 tokens, riding pure community energy and liquidity.',
    tags: ['Meme', 'Community', 'High volume'],
  },
];

export interface StockAsset {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  volume: string;
  currency: 'USD' | 'INR';
  market: 'US' | 'IN';
  about: string;
}

export const STOCK_BASELINES: StockAsset[] = [
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Semiconductors', price: 187.6, changePct: 2.6, volume: '205.4M', currency: 'USD', market: 'US', about: 'The engine of the AI revolution. Data-center GPUs (H100/Blackwell) power training of nearly every frontier AI model in the world.' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 254.8, changePct: 0.8, volume: '48.2M', currency: 'USD', market: 'US', about: 'The world\u2019s most valuable consumer tech company — iPhone, Mac, Services and a fast-growing AI roadmap with Apple Intelligence.' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', price: 512.4, changePct: 1.2, volume: '22.6M', currency: 'USD', market: 'US', about: 'Cloud and AI superpower. Azure, Office 365, Copilot and the OpenAI partnership make MSFT the enterprise AI kingmaker.' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', price: 242.9, changePct: -0.4, volume: '28.1M', currency: 'USD', market: 'US', about: 'Parent of Google Search, YouTube, Android and DeepMind. Gemini AI and cloud growth drive the next chapter.' },
  { symbol: 'AMZN', name: 'Amazon', sector: 'E-commerce', price: 226.3, changePct: 0.9, volume: '39.7M', currency: 'USD', market: 'US', about: 'E-commerce giant plus AWS — the most profitable cloud infrastructure business, now leaning into AI with Trainium chips and Bedrock.' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Auto & Energy', price: 438.2, changePct: -1.8, volume: '88.5M', currency: 'USD', market: 'US', about: 'Electric vehicles, energy storage and autonomy. Robotaxi and Optimus optionality keep TSLA the most-watched stock on the street.' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', price: 742.5, changePct: 1.6, volume: '14.3M', currency: 'USD', market: 'US', about: 'Facebook, Instagram, WhatsApp plus open-source Llama AI. Advertising machine with 3.4B+ daily users.' },
  { symbol: 'AMD', name: 'AMD', sector: 'Semiconductors', price: 247.9, changePct: 3.4, volume: '62.7M', currency: 'USD', market: 'US', about: 'NVIDIA\u2019s fiercest rival in AI chips. MI300/MI350 accelerators + server CPUs (EPYC) give AMD a real shot at the AI data-center pie.' },
  { symbol: 'NFLX', name: 'Netflix', sector: 'Streaming', price: 1247.3, changePct: 1.1, volume: '3.4M', currency: 'USD', market: 'US', about: 'Global streaming king — 300M+ households, ad-tier momentum and a live-events push (NFL, boxing) driving fresh growth.' },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Cloud & Software', price: 845.6, changePct: 2.2, volume: '8.9M', currency: 'USD', market: 'US', about: 'Database legend turned AI-cloud contender. OCI\u2019s multi-billion Stargate deals with OpenAI/xAI made ORCL an AI infrastructure proxy.' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Banking', price: 302.8, changePct: 0.3, volume: '9.1M', currency: 'USD', market: 'US', about: 'America\u2019s largest bank — a fortress balance sheet, market leadership in trading, and aggressive blockchain initiatives (JPM Coin, Kinexys).' },
  { symbol: 'V', name: 'Visa', sector: 'Payments', price: 352.4, changePct: 0.5, volume: '5.8M', currency: 'USD', market: 'US', about: 'The rails of global money. Visa processes 250B+ transactions a year and bridges traditional payments with stablecoin settlement.' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Mobility', price: 96.7, changePct: -0.9, volume: '18.4M', currency: 'USD', market: 'US', about: 'Rides + delivery + freight at global scale. Autonomous vehicle partnerships (Waymo, Nuro) could reshape its cost curve.' },
  { symbol: 'INTC', name: 'Intel', sector: 'Semiconductors', price: 38.9, changePct: -1.4, volume: '74.2M', currency: 'USD', market: 'US', about: 'The turnaround story of the decade. Foundry bet, 18A process and US CHIPS backing make INTC a high-risk, high-reward play.' },
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Conglomerate', price: 1482.0, changePct: 0.6, volume: '11.8M', currency: 'INR', market: 'IN', about: 'India\u2019s biggest company — oil-to-telecom, Jio\u2019s 480M users, retail empire and green energy pivot.' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT Services', price: 4128.0, changePct: -0.7, volume: '2.9M', currency: 'INR', market: 'IN', about: 'India\u2019s largest IT services firm — AI-led transformation deals for global enterprises and strong dividend history.' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT Services', price: 1892.0, changePct: 1.1, volume: '6.4M', currency: 'INR', market: 'IN', about: 'Global digital-services leader with Topaz AI offerings and deep banking/retail client relationships.' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1718.0, changePct: 0.4, volume: '18.2M', currency: 'INR', market: 'IN', about: 'India\u2019s largest private bank — merged with HDFC Ltd, now a deposits-and-mortgage powerhouse.' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', price: 1364.5, changePct: 0.9, volume: '14.6M', currency: 'INR', market: 'IN', about: 'India\u2019s second-largest private bank — best-in-class asset quality, digital leadership (iMobile) and consistent 18%+ ROE.' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'PSU Banking', price: 895.3, changePct: 1.4, volume: '22.1M', currency: 'INR', market: 'IN', about: 'India\u2019s largest public bank — 22,000+ branches, dominant in government banking and a key play on India\u2019s credit boom.' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', price: 2048.0, changePct: 0.7, volume: '7.3M', currency: 'INR', market: 'IN', about: 'India\u2019s telecom co-leader — 380M+ subscribers, fast-growing Africa business and a serious data-center/AI infrastructure push.' },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG & Tobacco', price: 465.8, changePct: -0.3, volume: '16.9M', currency: 'INR', market: 'IN', about: 'Cigarette cash cow funding a FMCG empire (Aashirvaad, Sunfeast) plus hotels and paperboards — India\u2019s dividend favorite.' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', price: 3846.0, changePct: 1.2, volume: '3.1M', currency: 'INR', market: 'IN', about: 'India\u2019s infrastructure kingmaker — metros, airports, defense and the green-energy buildout all run through L&T.' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', price: 782.5, changePct: -1.2, volume: '26.4M', currency: 'INR', market: 'IN', about: 'JLR luxury + India\u2019s #1 EV maker. Commercial vehicles, JLR margins and the EV transition drive the story.' },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT Services', price: 1876.0, changePct: 0.8, volume: '4.2M', currency: 'INR', market: 'IN', about: 'Engineering-led IT services — deep product engineering, software estates and a growing AI/GenAI deal book.' },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'IT Services', price: 306.4, changePct: -0.5, volume: '12.7M', currency: 'INR', market: 'IN', about: 'Global IT services with consulting muscle (Capco, Rizing) — a value play among Indian IT majors.' },
];

export const INDICES = [
  { symbol: 'NIFTY50', name: 'Nifty 50', price: 25980.0, changePct: 0.45 },
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 84920.0, changePct: 0.38 },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: 58420.0, changePct: 0.62 },
  { symbol: 'SPX', name: 'S&P 500', price: 6892.0, changePct: 0.28 },
  { symbol: 'NDX', name: 'Nasdaq 100', price: 25430.0, changePct: 0.54 },
  { symbol: 'DJI', name: 'Dow Jones', price: 47850.0, changePct: 0.12 },
];
