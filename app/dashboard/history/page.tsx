'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AttendanceLog = {
  id: string
  punch_type: string
  punched_at: string
}

const punchLabels: Record<string, { label: string; color: string }> = {
  clock_in:    { label: '出勤',   color: 'bg-green-100 text-green-700' },
  clock_out:   { label: '退勤',   color: 'bg-red-100 text-red-700' },
  break_start: { label: '休憩開始', color: 'bg-yellow-100 text-yellow-700' },
  break_end:   { label: '休憩終了', color: 'bg-blue-100 text-blue-700' },
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchLogs = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, punch_type, punched_at')
        .eq('employee_id', user.id)
        .order('punched_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setLogs(data)
      }

      setLoading(false)
    }

    fetchLogs()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">

        {/* ヘッダー */}
        <div className="flex items-center mb-8 pt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 text-sm mr-4"
          >
            ← 打刻画面に戻る
          </button>
          <h1 className="text-xl font-bold text-gray-800">打刻履歴</h1>
        </div>

        {/* 履歴一覧 */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              読み込み中...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              打刻履歴がありません
            </div>
          ) : (
            <ul>
              {logs.map((log, index) => {
                const { label, color } = punchLabels[log.punch_type] ?? {
                  label: log.punch_type,
                  color: 'bg-gray-100 text-gray-700',
                }
                const date = new Date(log.punched_at)
                return (
                  <li
                    key={log.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== logs.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${color}`}>
                      {label}
                    </span>
                    <div className="text-right">
                      <p className="text-gray-800 font-medium">
                        {date.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {date.toLocaleDateString('ja-JP', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}