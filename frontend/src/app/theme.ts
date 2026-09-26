import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'indigo',
  primaryShade: 6,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: '650' },
  defaultRadius: 'md',
  colors: {
    indigo: ['#f1f3ff', '#e0e4ff', '#c3c9ff', '#a3acff', '#8993fb', '#7782f2', '#6670e6', '#555ed0', '#474fb9', '#3c439f'],
  },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
  },
})
