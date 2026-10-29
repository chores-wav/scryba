const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src', 'assets', 'audio');
const rate = 22050;

function writeWav(folder, name, seconds, sampleAt) {
  const count = Math.floor(rate * seconds);
  const data = Buffer.alloc(count * 2);
  for (let i = 0; i < count; i++) {
    const value = Math.max(-1, Math.min(1, sampleAt(i / rate, i, count)));
    data.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.join(root, folder), { recursive: true });
  fs.writeFileSync(path.join(root, folder, name), Buffer.concat([header, data]));
}

const TAU = Math.PI * 2;
const fade = (t, duration, edge = 1.2) => Math.min(1, t / edge, (duration - t) / edge);
const chord = (frequencies, t, phases = frequencies.map(() => 0)) => frequencies.reduce((sum, frequency, i) => sum + Math.sin(TAU * frequency * t + phases[i]) / frequencies.length, 0);

writeWav('music', 'taverna-ao-entardecer.wav', 32, (t, i, n) => {
  const beat = Math.floor(t / 4) % 4;
  const roots = [[110, 164.81, 220], [98, 146.83, 196], [130.81, 196, 261.63], [87.31, 130.81, 174.61]][beat];
  const pluckT = t % 2;
  const pluck = Math.sin(TAU * [440, 392, 329.63, 523.25][Math.floor(t / 2) % 4] * pluckT) * Math.exp(-pluckT * 2.4);
  const loopFade = Math.min(1, i / (rate * 2), (n - i) / (rate * 2));
  return loopFade * (0.23 * chord(roots, t) + 0.13 * chord(roots.map(f => f * 2), t, [0, 0.2, 0.4]) + 0.16 * pluck);
});

writeWav('music', 'floresta-sob-a-nevoa.wav', 32, (t, i, n) => {
  const roots = [55, 82.41, 110, 164.81];
  const wind = Math.sin(TAU * 0.12 * t) * 0.04 + Math.sin(TAU * 0.071 * t + 1.4) * 0.03;
  const bellT = t % 8;
  const bell = Math.sin(TAU * [392, 493.88, 587.33, 493.88][Math.floor(t / 8)] * bellT) * Math.exp(-bellT * 1.1);
  const loopFade = Math.min(1, i / (rate * 2), (n - i) / (rate * 2));
  return loopFade * (0.34 * chord(roots, t, [0, 0.4, 1.1, 2]) + wind + 0.15 * bell);
});

writeWav('effects', 'choque-de-espadas.wav', 1.1, (t) => {
  const noise = Math.sin(t * 19031) * Math.sin(t * 7133);
  const ring = Math.sin(TAU * (900 - 500 * t) * t);
  return fade(t, 1.1, 0.008) * Math.exp(-t * 5) * (0.62 * noise + 0.38 * ring);
});
writeWav('effects', 'feitico-arcano.wav', 2.4, t => {
  const sweep = 330 + 900 * Math.sin(Math.PI * t / 2.4) ** 2;
  return fade(t, 2.4, 0.25) * (0.28 * Math.sin(TAU * sweep * t) + 0.15 * Math.sin(TAU * sweep * 1.5 * t) * Math.sin(TAU * 6 * t));
});
writeWav('effects', 'trovao-distante.wav', 3.6, t => {
  const rumble = Math.sin(t * 127.1) * Math.sin(t * 61.9) * Math.sin(t * 19.7);
  const crack = t < 0.16 ? Math.sin(t * 7310) * Math.exp(-t * 22) : 0;
  return fade(t, 3.6, 0.3) * (0.55 * rumble * Math.exp(-t * 0.6) + 0.55 * crack);
});
writeWav('effects', 'porta-de-madeira.wav', 1.5, t => {
  const knock = Math.exp(-1 * (((t - 0.12) / 0.055) ** 2)) + 0.8 * Math.exp(-1 * (((t - 0.34) / 0.065) ** 2));
  const creak = t > 0.5 ? Math.sin(TAU * (150 - 90 * (t - 0.5)) * t) * Math.exp(-(t - 0.5) * 2) : 0;
  return fade(t, 1.5, 0.05) * (0.65 * knock * Math.sin(TAU * 85 * t) + 0.25 * creak);
});
writeWav('effects', 'passos-na-pedra.wav', 1.8, t => {
  const steps = [0.15, 0.72, 1.28].reduce((sum, at) => sum + Math.exp(-1 * (((t - at) / 0.09) ** 2)) * Math.sin(TAU * 75 * (t - at)), 0);
  return fade(t, 1.8, 0.08) * 0.7 * steps;
});
