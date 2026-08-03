/** @type {import('next').NextConfig} */
const config = {
  reactCompiler: process.env.NODE_ENV === 'production',
  devIndicators: false,
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'hogetalk_local.aihoge.com'],
  images: {
    unoptimized: true,
  },
}

export default config
