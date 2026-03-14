"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force"
import { FileText, Image, Mic, X, ZoomIn, ZoomOut, Maximize2, Search, ExternalLink } from "lucide-react"
import Link from "next/link"

const TYPE_COLORS: Record<string, string> = {
  text: "#C4724A",
  link: "#7B9E87",
  image: "#C08B8B",
  voice: "#C9A227",
}

const TYPE_LABELS: Record<string, string> = {
  text: "텍스트",
  link: "링크",
  image: "이미지",
  voice: "음성",
}

interface GraphNode extends SimulationNodeDatum {
  id: string
  label: string
  type: string
  tags: string[]
  project_id: string | null
  created_at: string
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  weight: number
  reason: "similarity" | "tag" | "project" | "ai"
}

interface Project {
  id: string
  name: string
  color: string | null
}

export function KnowledgeMap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [filter, setFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [threshold, setThreshold] = useState(0.3)
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; nodeId: string | null }>({
    dragging: false, startX: 0, startY: 0, nodeId: null,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null)

  // Resize observer
  useEffect(() => {
    const container = svgRef.current?.parentElement
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Fetch data
  useEffect(() => {
    fetch("/api/knowledge-map")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.nodes) {
          setNodes(data.nodes)
          setEdges(data.edges)
          setProjects(data.projects || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Run simulation
  useEffect(() => {
    if (nodes.length === 0) return

    // Compute cluster centers based on project/tag
    const clusterKeys = new Set<string>()
    nodes.forEach(n => {
      clusterKeys.add(n.project_id || n.tags[0] || "__none__")
    })
    const totalClusters = clusterKeys.size
    const clusterMap = new Map<string, { x: number; y: number }>()
    let clusterIdx = 0
    for (const key of clusterKeys) {
      const angle = (clusterIdx / totalClusters) * 2 * Math.PI
      clusterMap.set(key, { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 })
      clusterIdx++
    }

    const sim = forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance((d: GraphEdge) => 80 / (d.weight + 0.1))
          .strength((d: GraphEdge) => d.weight * 0.3)
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(20))
      .alphaDecay(0.02)

    simRef.current = sim

    sim.on("tick", () => {
      // Nudge nodes toward cluster centers
      const alpha = sim.alpha()
      for (const n of nodes) {
        const key = n.project_id || n.tags[0] || "__none__"
        const center = clusterMap.get(key)
        if (center && n.x != null && n.y != null && n.vx != null && n.vy != null) {
          n.vx += (center.x - n.x) * 0.05 * alpha
          n.vy += (center.y - n.y) * 0.05 * alpha
        }
      }
      setNodes([...nodes])
    })

    return () => { sim.stop() }
  }, [nodes.length, edges.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Connected nodes for highlighting
  const connectedTo = useCallback(
    (nodeId: string) => {
      const connected = new Set<string>()
      for (const e of edges) {
        const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source
        const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target
        if (src === nodeId) connected.add(tgt as string)
        if (tgt === nodeId) connected.add(src as string)
      }
      return connected
    },
    [edges]
  )

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.2, Math.min(4, t.scale * delta)),
    }))
  }

  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as SVGElement).closest(".graph-node")) return
    dragRef.current = { dragging: true, startX: e.clientX - transform.x, startY: e.clientY - transform.y, nodeId: null }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current.dragging) return
    if (dragRef.current.nodeId) {
      // Dragging a node
      const node = nodes.find((n) => n.id === dragRef.current.nodeId)
      if (node && simRef.current) {
        node.fx = (e.clientX - transform.x - dimensions.width / 2) / transform.scale
        node.fy = (e.clientY - transform.y - dimensions.height / 2) / transform.scale
        simRef.current.alpha(0.3).restart()
        setNodes([...nodes])
      }
    } else {
      // Panning
      setTransform((t) => ({
        ...t,
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      }))
    }
  }

  function handlePointerUp() {
    if (dragRef.current.nodeId) {
      const node = nodes.find((n) => n.id === dragRef.current.nodeId)
      if (node) {
        node.fx = null
        node.fy = null
      }
    }
    dragRef.current = { dragging: false, startX: 0, startY: 0, nodeId: null }
  }

  function handleNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation()
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, nodeId }
  }

  function handleNodeClick(node: GraphNode) {
    // Only select if we didn't drag
    const dx = 0 // click means no drag
    if (Math.abs(dx) < 5) {
      setSelectedNode(selectedNode?.id === node.id ? null : node)
    }
  }

  function resetView() {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  const activeHighlight = hoveredNode || selectedNode?.id || null
  const highlightedConnections = activeHighlight ? connectedTo(activeHighlight) : null

  // Filtered nodes/edges
  const visibleNodes = filter ? nodes.filter((n) => n.type === filter) : nodes
  const visibleIds = new Set(visibleNodes.map((n) => n.id))
  const visibleEdges = edges.filter((e) => {
    if (e.reason === "similarity" && e.weight < threshold) return false
    const src = typeof e.source === "object" ? (e.source as GraphNode).id : e.source
    const tgt = typeof e.target === "object" ? (e.target as GraphNode).id : e.target
    return visibleIds.has(src as string) && visibleIds.has(tgt as string)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60 animate-spin" />
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/50">
        <p className="text-lg font-display">아직 연결할 기억이 부족해요</p>
        <p className="text-sm">메모를 더 저장하면 지식 맵이 만들어집니다</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Type filter */}
      <div className="absolute top-4 left-4 z-10 flex gap-1.5">
        <button
          onClick={() => setFilter(null)}
          className={`px-2.5 py-1 rounded-full text-ui-sm font-medium transition-colors ${
            !filter ? "bg-primary text-primary-foreground" : "bg-muted/80 text-muted-foreground hover:bg-muted"
          }`}
        >
          전체
        </button>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? null : type)}
            className={`px-2.5 py-1 rounded-full text-ui-sm font-medium transition-colors ${
              filter === type ? "text-white" : "bg-muted/80 text-muted-foreground hover:bg-muted"
            }`}
            style={filter === type ? { backgroundColor: TYPE_COLORS[type] } : undefined}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-2 py-1 w-32 rounded-full text-ui-sm bg-muted/80 text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(4, t.scale * 1.3) }))}
          className="w-8 h-8 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.2, t.scale * 0.7) }))}
          className="w-8 h-8 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Similarity threshold slider */}
      <div className="absolute bottom-12 left-4 z-10 flex items-center gap-2">
        <span className="text-ui-xs text-muted-foreground/50">유사도</span>
        <input
          type="range"
          min={0.3}
          max={0.9}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-24 h-1 accent-primary"
        />
        <span className="text-ui-xs text-muted-foreground/50 tabular-nums">{threshold.toFixed(2)}</span>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 z-10 text-ui-sm text-muted-foreground/40 space-x-3">
        <span>{visibleNodes.length}개 노드</span>
        <span>{visibleEdges.length}개 연결</span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <g transform={`translate(${dimensions.width / 2 + transform.x}, ${dimensions.height / 2 + transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {visibleEdges.map((edge, i) => {
            const src = edge.source as GraphNode
            const tgt = edge.target as GraphNode
            if (!src.x || !tgt.x) return null

            const isHighlighted =
              activeHighlight &&
              (src.id === activeHighlight || tgt.id === activeHighlight)

            const opacity = activeHighlight
              ? isHighlighted ? 0.7 : 0.05
              : edge.reason === "ai" ? 0.4 : edge.reason === "similarity" ? 0.25 : 0.12

            return (
              <line
                key={i}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={
                  edge.reason === "ai"
                    ? "#9B7DDB"
                    : edge.reason === "similarity"
                    ? "#C4724A"
                    : edge.reason === "tag"
                    ? "#7B9E87"
                    : "#8B7355"
                }
                strokeWidth={edge.reason === "ai" ? Math.max(edge.weight * 2.5, 1.5) : edge.weight * 2}
                opacity={opacity}
                strokeDasharray={
                  edge.reason === "project" ? "4 2"
                    : edge.reason === "ai" && edge.weight < 0.6 ? "6 3"
                    : undefined
                }
              />
            )
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            if (node.x == null || node.y == null) return null

            const isActive = activeHighlight === node.id
            const isConnected = highlightedConnections?.has(node.id)
            const searchMatch = !searchQuery || node.label.toLowerCase().includes(searchQuery.toLowerCase())
            const dimmed = (activeHighlight && !isActive && !isConnected) || (!!searchQuery && !searchMatch)

            const radius = isActive ? 10 : 7
            const color = TYPE_COLORS[node.type] || "#999"

            return (
              <g
                key={node.id}
                className="graph-node"
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: "pointer", opacity: dimmed ? 0.1 : 1, transition: "opacity 0.2s" }}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onPointerUp={() => handleNodeClick(node)}
                onPointerEnter={() => setHoveredNode(node.id)}
                onPointerLeave={() => setHoveredNode(null)}
              >
                {/* Glow for active */}
                {isActive && (
                  <circle r={16} fill={color} opacity={0.15} />
                )}
                {/* Main circle */}
                <circle
                  r={radius}
                  fill={color}
                  stroke={isActive ? "white" : "transparent"}
                  strokeWidth={2}
                />
                {/* Label on hover/active */}
                {(isActive || isConnected || (searchQuery && searchMatch)) && (
                  <text
                    y={-14}
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-foreground/70"
                    fontSize={10}
                    fontWeight={isActive ? 600 : 400}
                  >
                    {node.label.slice(0, 30)}
                    {node.label.length > 30 ? "..." : ""}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-10 w-72 rounded-xl border border-border/60 bg-background/95 backdrop-blur-lg p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[selectedNode.type] }}
            />
            <span className="text-ui-xs uppercase tracking-wider text-muted-foreground/50">
              {TYPE_LABELS[selectedNode.type]}
            </span>
            <span className="text-ui-xs text-muted-foreground/30 ml-auto">
              {new Date(selectedNode.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>

          <p className="text-ui-sm text-foreground/80 leading-relaxed line-clamp-4 mb-2">
            {selectedNode.label}
          </p>

          {selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-ui-2xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {selectedNode.project_id && (
            <div className="mt-2 text-ui-xs text-muted-foreground/40">
              프로젝트: {projects.find((p) => p.id === selectedNode.project_id)?.name || "..."}
            </div>
          )}

          <div className="mt-2 text-ui-xs text-muted-foreground/30">
            {connectedTo(selectedNode.id).size}개 연결
          </div>

          <Link
            href="/"
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            원본 보기
          </Link>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 text-ui-xs text-muted-foreground/40">
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 bg-[#9B7DDB] rounded" /> AI 연결
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 bg-[#C4724A] rounded" /> 유사도
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 bg-[#7B9E87] rounded" /> 태그
        </span>
        <span className="flex items-center gap-1">
          <span className="w-6 h-0.5 border-t border-dashed border-[#8B7355]" style={{ width: 24 }} /> 프로젝트
        </span>
      </div>
    </div>
  )
}
