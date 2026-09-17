"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Player, Week } from "@/lib/types"
import { Plus, Calendar, Trash2, Users2, MapPin, CheckCircle, Clock, Edit2, AlertTriangle } from "lucide-react"
import { createWeek, deleteWeek, updateAttendance, getWeekAttendance } from "@/app/actions/weeks"
import { formatDate, todayDateString } from "@/lib/utils"

interface EventsManagerProps {
  initialEvents: Week[]
  players: Player[]
  hasCurrentEvent: boolean
  onEventCreated?: () => void
}

export function EventsManager({ initialEvents, players: initialPlayers, hasCurrentEvent, onEventCreated }: EventsManagerProps) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [players] = useState(initialPlayers)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [currentEventWarningOpen, setCurrentEventWarningOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Week | null>(null)
  const [loading, setLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Week | null>(null)
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => todayDateString()
  
  // Calculate next event number
  const getNextEventNumber = () => {
    if (events.length === 0) return "1"
    const maxEvent = Math.max(...events.map(e => e.week_number))
    return String(maxEvent + 1)
  }
  
  // Form state for create
  const [newEventNumber, setNewEventNumber] = useState(getNextEventNumber())
  const [newEventDate, setNewEventDate] = useState(getTodayDate())
  const [newEventCourse, setNewEventCourse] = useState("")
  const [newEventIsDoubles, setNewEventIsDoubles] = useState(false)
  
  // Form state for edit
  const [editEventDate, setEditEventDate] = useState("")
  const [editEventCourse, setEditEventCourse] = useState("")
  const [editCtpWinnerId, setEditCtpWinnerId] = useState<string | null>(null)
  const [editAttendance, setEditAttendance] = useState<{ player_id: string; player_name: string; score: number | null }[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [editSelectedPlayers, setEditSelectedPlayers] = useState<Set<string>>(new Set())
  
  const handleCreateEvent = async () => {
    if (!newEventNumber || !newEventDate) return
    
    setLoading(true)
    setCreateError(null)
    try {
      const result = await createWeek(
        parseInt(newEventNumber),
        newEventDate,
        newEventCourse || null,
        newEventIsDoubles
      )
      
      if (result.success && result.week) {
        const updatedEvents = [result.week, ...events]
        setEvents(updatedEvents)
        
        // Reset form
        const maxEvent = Math.max(...updatedEvents.map(e => e.week_number))
        setNewEventNumber(String(maxEvent + 1))
        setNewEventDate(getTodayDate())
        setNewEventCourse("")
        setNewEventIsDoubles(false)
        setCreateDialogOpen(false)
        router.refresh()
        // Players are now checked in on the Current Event tab
        onEventCreated?.()
      } else {
        setCreateError(result.error ?? "Failed to create event")
      }
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return
    
    setLoading(true)
    try {
      const result = await deleteWeek(eventToDelete.id)
      if (result.success) {
        setEvents(events.filter(e => e.id !== eventToDelete.id))
        router.refresh()
      }
    } finally {
      setLoading(false)
      setDeleteConfirmOpen(false)
      setEventToDelete(null)
    }
  }
  
  const openEditDialog = async (event: Week) => {
    setEditingEvent(event)
    setEditEventDate(event.date)
    setEditEventCourse(event.course_name || "")
    setEditCtpWinnerId(event.ctp_winner_id || null)
    setEditDialogOpen(true)
    
    // Fetch attendance for this event
    setLoadingAttendance(true)
    try {
      const attendance = await getWeekAttendance(event.id)
      setEditAttendance(attendance)
      // Set the selected players based on current attendance
      setEditSelectedPlayers(new Set(attendance.map(a => a.player_id)))
    } finally {
      setLoadingAttendance(false)
    }
  }
  
  const handleEditEvent = async () => {
    if (!editingEvent) return
    
    setLoading(true)
    try {
      const { updateWeek } = await import("@/app/actions/weeks")
      const result = await updateWeek(editingEvent.id, {
        date: editEventDate,
        course_name: editEventCourse || null,
        ctp_winner_id: editCtpWinnerId
      })
      
      // Build attendance data from selected players
      // Keep existing scores for players who were already attending
      const attendanceData = Array.from(editSelectedPlayers).map(playerId => {
        const existingAttendance = editAttendance.find(a => a.player_id === playerId)
        return {
          player_id: playerId,
          score: existingAttendance?.score ?? null
        }
      })
      
      // Update attendance (this handles add/remove)
      await updateAttendance(editingEvent.id, attendanceData)
      
      if (result.success) {
        setEvents(events.map(e => 
          e.id === editingEvent.id 
            ? { ...e, date: editEventDate, course_name: editEventCourse || null, ctp_winner_id: editCtpWinnerId }
            : e
        ))
        setEditDialogOpen(false)
        setEditingEvent(null)
        setEditAttendance([])
        setEditSelectedPlayers(new Set())
        setEditCtpWinnerId(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }
  
  const updateEditScore = (playerId: string, score: string) => {
    const numScore = score === "" ? null : parseInt(score)
    setEditAttendance(prev => 
      prev.map(a => a.player_id === playerId ? { ...a, score: numScore } : a)
    )
  }
  
  const toggleEditPlayerSelection = (playerId: string) => {
    setEditSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Events</h2>
          <p className="text-muted-foreground">Create and manage league events</p>
        </div>
        
        <Button
          className="gap-2"
          onClick={() => {
            if (hasCurrentEvent) {
              setCurrentEventWarningOpen(true)
            } else {
              // Recompute the default number from the current events so deletions are
              // reflected (always highest existing event number + 1).
              setNewEventNumber(getNextEventNumber())
              setNewEventDate(getTodayDate())
              setCreateDialogOpen(true)
            }
          }}
        >
          <Plus className="h-4 w-4" />
          New Event
        </Button>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-number">Event Number</Label>
                  <Input
                    id="event-number"
                    type="number"
                    value={newEventNumber}
                    onChange={(e) => setNewEventNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event-course">Course</Label>
                <Input
                  id="event-course"
                  value={newEventCourse}
                  onChange={(e) => setNewEventCourse(e.target.value)}
                  placeholder="Course name"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-doubles"
                  checked={newEventIsDoubles}
                  onCheckedChange={(checked) => setNewEventIsDoubles(checked as boolean)}
                />
                <Label htmlFor="is-doubles" className="cursor-pointer">
                  This is a Doubles event
                </Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                After creating the event, you&apos;ll check players in on the Current Event tab.
              </p>
              
              {createError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {createError}
                </p>
              )}
              
              <Button 
                onClick={handleCreateEvent} 
                disabled={loading || !newEventNumber || !newEventDate}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Edit Event Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event {editingEvent?.week_number}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-event-date">Date</Label>
                  <Input
                    id="edit-event-date"
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-event-course">Course</Label>
                  <Input
                    id="edit-event-course"
                    value={editEventCourse}
                    onChange={(e) => setEditEventCourse(e.target.value)}
                    placeholder="Course name"
                  />
                </div>
              </div>
              
              {/* Attendance - Add/Remove Players */}
              <div className="space-y-2">
                <Label>Attendance ({editSelectedPlayers.size} players)</Label>
                {loadingAttendance ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {players.map(player => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          editSelectedPlayers.has(player.id)
                            ? "bg-primary/20 border border-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                        onClick={() => toggleEditPlayerSelection(player.id)}
                      >
                        <Checkbox
                          checked={editSelectedPlayers.has(player.id)}
                          onCheckedChange={() => toggleEditPlayerSelection(player.id)}
                        />
                        <span className="text-sm truncate">{player.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* CTP Winner */}
              <div className="space-y-2">
                <Label>CTP Winner</Label>
                <Select
                  value={editCtpWinnerId || "none"}
                  onValueChange={(value) => setEditCtpWinnerId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CTP winner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No CTP winner</SelectItem>
                    {players.filter(p => editSelectedPlayers.has(p.id)).map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Player Scores - only show for attending players */}
              {editSelectedPlayers.size > 0 && (
                <div className="space-y-2">
                  <Label>Player Scores</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {players
                      .filter(p => editSelectedPlayers.has(p.id))
                      .map(player => {
                        const att = editAttendance.find(a => a.player_id === player.id)
                        return (
                          <div key={player.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded">
                            <span className="text-sm font-medium truncate flex-1">{player.name}</span>
                            <Input
                              type="number"
                              value={att?.score ?? ""}
                              onChange={(e) => {
                                const numScore = e.target.value === "" ? null : parseInt(e.target.value)
                                setEditAttendance(prev => {
                                  const existing = prev.find(a => a.player_id === player.id)
                                  if (existing) {
                                    return prev.map(a => a.player_id === player.id ? { ...a, score: numScore } : a)
                                  } else {
                                    return [...prev, { player_id: player.id, player_name: player.name, score: numScore }]
                                  }
                                })
                              }}
                              className="w-20 text-center"
                              placeholder="--"
                            />
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleEditEvent} 
                disabled={loading || !editEventDate}
                className="w-full"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No events yet. Create your first event to get started.
            </CardContent>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} className={event.is_submitted ? "border-accent/50" : "border-primary/50"}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="text-2xl sm:text-3xl font-bold text-primary shrink-0">
                      {event.week_number}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-sm sm:text-base">Event {event.week_number}</span>
                        {event.is_doubles && (
                          <Badge variant="default" className="bg-primary text-xs">
                            <Users2 className="h-3 w-3 mr-1" />
                            Doubles
                          </Badge>
                        )}
                        {event.is_submitted ? (
                          <Badge variant="default" className="bg-accent text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-primary text-primary text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(event.date, "MMM d, yyyy")}
                        </span>
                        {event.course_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.course_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => openEditDialog(event)}
                      disabled={loading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setEventToDelete(event)
                        setDeleteConfirmOpen(true)
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Event
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete Week {eventToDelete?.week_number}? This will permanently remove:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-destructive">•</span>
              <span>All attendance records for this event</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-destructive">•</span>
              <span>All team assignments and scores</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-destructive">•</span>
              <span>CTP winner records</span>
            </div>
          </div>
          <p className="text-sm text-destructive font-medium">This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Warning: a current event is already in progress */}
      <AlertDialog open={currentEventWarningOpen} onOpenChange={setCurrentEventWarningOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Finish the Current Event First
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              There is already an event in progress that hasn&apos;t been submitted yet. 
              Submit or delete the current event before creating a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCurrentEventWarningOpen(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
