const finite = Number.isFinite;
const decimal = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function hourlyDay(hourly, key, date) {
  return (hourly?.time || []).flatMap((time, i) => time.startsWith(`${date}T`) && finite(hourly[key]?.[i]) ? [{ hour: Number(time.slice(11, 13)), time: time.slice(11, 16), value: hourly[key][i] }] : []);
}
export function conditionsSummary({ wind, windHours = [], waves = [], levels = [], events = [], rain, moon }) {
  const maxWave = waves.length ? Math.max(...waves.map(p => p.value)) : null;
  const amplitude = levels.length >= 2 ? Math.max(...levels) - Math.min(...levels) : null;
  const cautions = [];
  if (finite(wind) && wind > 28) cautions.push('vento acima de 28 km/h');
  if (finite(maxWave) && maxWave >= 2) cautions.push('ondas de 2 m ou mais');
  const peak = windHours.reduce((best, p) => !best || p.value > best.value ? p : best, null);
  const period = peak ? ['de madrugada', 'pela manhã', 'à tarde', 'à noite'][Math.floor(peak.hour / 6)] : null;
  const average = (start, end) => {
    const points = waves.filter(p => p.hour >= start && p.hour < end);
    return points.length >= 3 ? points.reduce((sum, p) => sum + p.value, 0) / points.length : null;
  };
  const morning = average(6, 12), afternoon = average(12, 18);
  const change = finite(morning) && finite(afternoon) ? afternoon - morning : null;
  const highs = events.filter(p => p.type === 'high').map(p => p.hour);
  const cards = [
    { title: 'Vento', warning: finite(wind) && wind > 28, text: finite(wind) ? `${wind > 28 ? 'Vento mais intenso' : wind > 15 ? 'Vento moderado' : 'Vento leve'}${period ? ` ${period}` : ' no dia'}. Máximo previsto: ${decimal(wind)} km/h${peak ? `, às ${peak.time}` : ''}.` : 'Sem previsão de vento para este dia.' },
    { title: 'Ondas', warning: finite(maxWave) && maxWave >= 2, text: finite(maxWave) ? `${finite(change) && change >= .3 ? 'Ondas aumentando à tarde.' : finite(change) && change <= -.3 ? 'Ondas diminuindo à tarde.' : finite(change) ? 'Ondas sem grande mudança entre manhã e tarde.' : 'Previsão de ondas disponível.'} Altura significativa máxima: ${decimal(maxWave)} m.` : 'Sem previsão de ondas para este local.' },
    { title: 'Maré', warning: false, text: finite(amplitude) ? `Variação prevista de ${decimal(amplitude)} m entre o menor e o maior nível do dia.${highs.length ? ` Picos de alta às ${highs.join(' e ')}.` : ' Sem picos de alta identificados.'}` : 'Sem dados suficientes para resumir a maré.' },
    { title: 'Chuva', warning: finite(rain) && rain >= 60, text: finite(rain) ? `Chance máxima de chuva: ${Math.round(rain)}%. ${rain >= 60 ? 'Vale se preparar para chuva.' : 'Confira a previsão novamente antes de sair.'}` : 'Sem previsão de chance de chuva para este dia.' }
  ];
  const complete = [wind, amplitude, rain, moon, maxWave].every(finite);
  const breakdown = complete ? [
    { name: 'Maré', points: Math.min(35, amplitude * 28), max: 35 },
    { name: 'Vento', points: Math.max(0, 30 - Math.max(0, wind - 10) * 1.4), max: 30 },
    { name: 'Lua', points: 15 + Math.abs(moon - 50) / 50 * 10, max: 25 },
    { name: 'Chuva', points: Math.max(0, 10 - rain * .1), max: 10 }
  ] : [];
  const score = complete ? Math.round(breakdown.reduce((sum, p) => sum + p.points, 0)) : null;
  const label = cautions.length ? 'Atenção' : !complete ? 'Dados parciais' : score >= 78 ? 'Excelente' : score >= 62 ? 'Favorável' : score >= 46 ? 'Razoável' : 'Atenção';
  return { cards, score, label, breakdown, headline: cautions.length ? 'Há condições que merecem atenção.' : !complete ? 'Previsão parcial para este dia.' : 'O dia em poucas palavras.', note: cautions.length ? `Atenção por ${cautions.join(' e ')}. Isso prevalece sobre a pontuação.` : !complete ? 'Não calculamos a nota quando faltam dados.' : 'Índice experimental de planejamento, não uma previsão de quantidade de peixes.' };
}
