import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface GraphNode {
  id: string
  label: string
  type: string
  tags: string[]
  project_id: string | null
  created_at: string
}

interface GraphEdge {
  source: string
  target: string
  weight: number
  reason: "similarity" | "tag" | "project" | "ai"
}

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get recent items with embeddings (limit to 80 for performance)
    const { data: items } = await supabase
      .from("items")
      .select("id, content, summary, type, project_id, created_at, embedding, item_tags(tags(id, name))")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .not("embedding", "is", null)
      .order("created_at", { ascending: false })
      .limit(80)

    if (!items || items.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] })
    }

    // Build nodes
    const nodes: GraphNode[] = items.map((item) => {
      const tags = (item.item_tags as unknown as { tags: { id: string; name: string } }[])
        ?.map((t) => t.tags?.name)
        .filter(Boolean) || []
      return {
        id: item.id,
        label: item.summary || item.content?.slice(0, 60) || "...",
        type: item.type,
        tags,
        project_id: item.project_id,
        created_at: item.created_at,
      }
    })

    // Build edges
    const edges: GraphEdge[] = []
    const edgeSet = new Set<string>()

    function addEdge(source: string, target: string, weight: number, reason: GraphEdge["reason"]) {
      const key = [source, target].sort().join("-")
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({ source, target, weight, reason })
      }
    }

    // 1. Tag-based edges (items sharing same tags)
    const tagToItems: Record<string, string[]> = {}
    for (const node of nodes) {
      for (const tag of node.tags) {
        if (!tagToItems[tag]) tagToItems[tag] = []
        tagToItems[tag].push(node.id)
      }
    }
    for (const items of Object.values(tagToItems)) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          addEdge(items[i], items[j], 0.6, "tag")
        }
      }
    }

    // 2. Project-based edges
    const projectToItems: Record<string, string[]> = {}
    for (const node of nodes) {
      if (node.project_id) {
        if (!projectToItems[node.project_id]) projectToItems[node.project_id] = []
        projectToItems[node.project_id].push(node.id)
      }
    }
    for (const items of Object.values(projectToItems)) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          addEdge(items[i], items[j], 0.4, "project")
        }
      }
    }

    // 3. Embedding similarity edges (top matches per item)
    // Use match_items RPC for a sample of items to find similar ones
    const sampleSize = Math.min(20, items.length)
    const sampleIndices = new Set<number>()
    while (sampleIndices.size < sampleSize) {
      sampleIndices.add(Math.floor(Math.random() * items.length))
    }

    const itemIds = new Set(items.map((i) => i.id))

    for (const idx of sampleIndices) {
      const item = items[idx]
      if (!item.embedding) continue

      const { data: matches } = await supabase.rpc("match_items", {
        query_embedding: item.embedding,
        match_threshold: 0.5,
        match_count: 6,
      })

      if (matches) {
        for (const match of matches) {
          if (match.id !== item.id && itemIds.has(match.id)) {
            addEdge(item.id, match.id, match.similarity, "similarity")
          }
        }
      }
    }

    // 4. AI auto-connect edges (from item_connections table)
    const itemIdList = Array.from(itemIds)
    const { data: aiConnections } = await supabase
      .from("item_connections")
      .select("source_id, target_id, similarity")
      .in("source_id", itemIdList)

    if (aiConnections) {
      for (const conn of aiConnections) {
        if (itemIds.has(conn.target_id)) {
          addEdge(conn.source_id, conn.target_id, conn.similarity, "ai")
        }
      }
    }

    // Get projects for color mapping
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, color")
      .eq("user_id", user.id)

    return NextResponse.json({
      nodes,
      edges,
      projects: projects || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Knowledge map error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
