export function transcribePodcastEvents(script: string) {
  const lines: any = script.split('===')[1].split('\n\n');
  const { speakers, events } = lines.reduce(
    (acc: { speakers: any[]; events: any[] }, line: string, i: number) => {
      const [hh, mm, ss] =
        line
          .split?.('[')?.[1]
          ?.split?.(']')?.[0]
          ?.split(':')
          ?.map?.(v => parseFloat(v)) || [];
      const speaker = line.split('] ')?.[1]?.split?.(':')?.[0];

      if (speaker && !acc.speakers.includes(speaker)) {
        acc.speakers.push(speaker);
      }

      if (typeof ss === 'number') {
        acc.events.push({ seconds: ss + 60 * mm * (hh + 1), speaker });
      }

      if (lines.length - 1 === i) {
        acc.speakers = acc.speakers.reduce((acc, v, i) => {
          acc[v] = i;
          return acc;
        }, {});
      }

      return acc;
    },
    { speakers: [], events: [] }
  );

  return { speakers, events };
}
