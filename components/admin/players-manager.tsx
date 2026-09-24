"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Player } from "@/lib/types"
import { Plus, Edit2, Trash2, UserPlus, Crown } from "lucide-react"
import { addPlayer, updatePlayer, deletePlayer, makeAllPlayersMembers } from "@/app/actions/players"

interface PlayersManagerProps {
  initialPlayers: Player[]
}

export function PlayersManager({ initialPlayers }: PlayersManagerProps) {
  const router = useRouter()
  const [players, setPlayers] = useState(initialPlayers)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerIsMember, setNewPlayerIsMember] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editName, setEditName] = useState("")
  const [editIsMember, setEditIsMember] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlayerName.trim()) return
    
    setLoading(true)
    setAddError(null)
    try {
      const result = await addPlayer(newPlayerName.trim(), newPlayerIsMember)
      if (result.success && result.player) {
        setPlayers(prev => [...prev, result.player!].sort((a, b) => a.name.localeCompare(b.name)))
        setNewPlayerName("")
        setNewPlayerIsMember(false)
        setAddDialogOpen(false)
        router.refresh()
      } else {
        setAddError(result.error ?? "Failed to add player")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !editName.trim()) return
    
    setLoading(true)
    try {
      const result = await updatePlayer(editingPlayer.id, editName.trim(), editIsMember)
      if (result.success) {
        setPlayers(prev => 
          prev.map(p => p.id === editingPlayer.id 
            ? { ...p, name: editName.trim(), is_member: editIsMember }
            : p
          ).sort((a, b) => a.name.localeCompare(b.name))
        )
        setEditDialogOpen(false)
        setEditingPlayer(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlayer = async (player: Player) => {
    if (!confirm(`Are you sure you want to delete ${player.name}? This will remove all their scores.`)) {
      return
    }
    
    setLoading(true)
    try {
      const result = await deletePlayer(player.id)
      if (result.success) {
        setPlayers(prev => prev.filter(p => p.id !== player.id))
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMakeAllMembers = async () => {
    if (!confirm(`Make all ${visitors.length} visitors members?`)) {
      return
    }

    setLoading(true)
    try {
      const result = await makeAllPlayersMembers()
      if (result.success) {
        setPlayers(prev => prev.map(p => ({ ...p, is_member: true })))
        router.refresh()
      } else {
        alert(result.error ?? "Failed to update players")
      }
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (player: Player) => {
    setEditingPlayer(player)
    setEditName(player.name)
    setEditIsMember(player.is_member)
    setEditDialogOpen(true)
  }

  const members = players.filter(p => p.is_member)
  const visitors = players.filter(p => !p.is_member)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Players ({players.length})
        </CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Player Name</Label>
                <Input
                  id="name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is-member">Paid Member ($25)</Label>
                <Switch
                  id="is-member"
                  checked={newPlayerIsMember}
                  onCheckedChange={setNewPlayerIsMember}
                />
              </div>
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !newPlayerName.trim()}>
                  {loading ? "Adding..." : "Add Player"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Members Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            Members ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.name}</span>
                  <Badge variant="default" className="text-xs">Member</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(player)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlayer(player)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members yet
              </p>
            )}
          </div>
        </div>

        {/* Visitors Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Visitors ({visitors.length})
            </h3>
            {visitors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMakeAllMembers}
                disabled={loading}
              >
                <Crown className="h-4 w-4 mr-2" />
                Make All Members
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {visitors.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <span className="font-medium">{player.name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(player)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlayer(player)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {visitors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No visitors
              </p>
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditPlayer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Player Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter player name"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-is-member">Paid Member ($25)</Label>
                <Switch
                  id="edit-is-member"
                  checked={editIsMember}
                  onCheckedChange={setEditIsMember}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !editName.trim()}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
