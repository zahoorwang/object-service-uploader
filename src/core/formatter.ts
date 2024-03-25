import table, { Header } from 'tty-table';

export function jsonify<S extends Endpoint.Struct>(data: Endpoint.Mapped<S>, format: (value: [string, S]) => Record<string, string>) {
  return JSON.stringify(Object.entries(data).map(format), null, 2);
}

export function tableify<S extends Endpoint.Struct>(data: Endpoint.Mapped<S>, columns: Header[] | string[], format: (value: [string, S]) => string[]) {
  const colors: string[] = ['magenta', 'yellow', 'blue', 'green', 'cyan'];
  const headers: Header[] = columns.map((it, idx) => {
    const color = colors[idx % colors.length];
    return typeof it === 'string' ? { align: 'left', headerAlign: 'left', color, headerColor: color, value: it } : { align: 'left', headerAlign: 'left', color, headerColor: color, ...it };
  });
  return table(headers, Object.entries(data).map(format), { borderColor: 'gray', borderStyle: 'dashed' }).render();
}
