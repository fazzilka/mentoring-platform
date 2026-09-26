/** Converts a wall-clock value in an IANA zone; rejects nonexistent DST times. */
export function zonedInstant(date: string, time: string, timeZone: string): string {
  const desired = `${date}T${time}:00`
  const wall = Date.parse(`${desired}Z`)
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  let instant = wall
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = formatter.format(new Date(instant)).replace(' ', 'T')
    if (shown === desired) return new Date(instant).toISOString()
    instant += wall - Date.parse(`${shown}Z`)
  }
  throw new Error('Такое местное время не существует. Выберите другое время.')
}
