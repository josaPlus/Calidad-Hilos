/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta personalizada requerida
        sage:    '#6A8D73',
        mist:    '#F4FDD9',
        leaf:    '#E4FFE1',
        cream:   '#FFE8C2',
        amber:   '#F0A868',
        // Semánticos derivados
        primary: {
          DEFAULT: '#6A8D73',
          50:  '#F4FDD9',
          100: '#E4FFE1',
          600: '#6A8D73',
          700: '#557060',
        },
        accent: {
          DEFAULT: '#F0A868',
          light:   '#FFE8C2',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 20px -8px rgba(106, 141, 115, 0.25)',
      },
    },
  },
  plugins: [],
};
