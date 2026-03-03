import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[160px]">
                <p className="text-sm font-bold text-slate-800 mb-2">{label}</p>
                {payload.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-500">
                            <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ background: entry.color }}
                            />
                            {entry.name}
                        </span>
                        <span className="font-bold text-slate-800">{entry.value}%</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function AttainmentChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                barCategoryGap="30%"
                barGap={4}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                    dataKey="co"
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '16px', fontWeight: 500 }}
                    iconType="circle"
                    iconSize={8}
                />
                <ReferenceLine y={75} stroke="#e2e8f0" strokeDasharray="4 4" />
                <Bar
                    dataKey="target"
                    name="Target Attainment"
                    fill="#e0e7ff"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    radius={[6, 6, 0, 0]}
                />
                <Bar
                    dataKey="actual"
                    name="Actual Attainment"
                    radius={[6, 6, 0, 0]}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.actual >= entry.target ? '#10b981' : '#f59e0b'}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
