
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "academic_items": {
                  Row: {
                    "completed": boolean,"completed_at": string | null,"created_at": string,"description": string | null,"due_at": string,"estimated_prep_minutes": number | null,"grade": string | null,"id": string,"kind": Database["public"]['Enums']["academic_kind"],"priority": Database["public"]['Enums']["priority"],"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed"?: boolean,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_at": string,"estimated_prep_minutes"?: number | null,"grade"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["academic_kind"],"priority"?: Database["public"]['Enums']["priority"],"subject_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed"?: boolean,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_at"?: string,"estimated_prep_minutes"?: number | null,"grade"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["academic_kind"],"priority"?: Database["public"]['Enums']["priority"],"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academic_items_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"ai_conversations": {
                  Row: {
                    "created_at": string,"id": string,"include_journal": boolean,"mode": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"include_journal"?: boolean,"mode"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"include_journal"?: boolean,"mode"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_messages": {
                  Row: {
                    "content": string,"conversation_id": string,"created_at": string,"id": string,"pending_actions": Json | null,"role": string,"tool_call_id": string | null,"tool_calls": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"conversation_id": string,"created_at"?: string,"id"?: string,"pending_actions"?: Json | null,"role": string,"tool_call_id"?: string | null,"tool_calls"?: Json | null,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"pending_actions"?: Json | null,"role"?: string,"tool_call_id"?: string | null,"tool_calls"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_messages_conversation_id_user_id_fkey"
      columns: ["conversation_id","user_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"ai_notes": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["note_kind"],"material_id": string | null,"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["note_kind"],"material_id"?: string | null,"subject_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["note_kind"],"material_id"?: string | null,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_notes_material_id_user_id_fkey"
      columns: ["material_id","user_id"]
isOneToOne: false
      referencedRelation: "study_materials"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "ai_notes_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "all_day": boolean,"created_at": string,"description": string | null,"ends_at": string | null,"id": string,"location": string | null,"starts_at": string,"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"location"?: string | null,"starts_at": string,"subject_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"location"?: string | null,"starts_at"?: string,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"class_sessions": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"kind": string,"location": string | null,"start_time": string,"subject_id": string,"user_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"kind"?: string,"location"?: string | null,"start_time": string,"subject_id": string,"user_id"?: string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"kind"?: string,"location"?: string | null,"start_time"?: string,"subject_id"?: string,"user_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"daily_briefings": {
                  Row: {
                    "briefing_date": string,"content": string,"created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "briefing_date": string,"content": string,"created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Update: {
                    "briefing_date"?: string,"content"?: string,"created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"flashcards": {
                  Row: {
                    "back": string,"box": number,"created_at": string,"due_at": string,"front": string,"id": string,"material_id": string | null,"review_count": number,"subject_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "back": string,"box"?: number,"created_at"?: string,"due_at"?: string,"front": string,"id"?: string,"material_id"?: string | null,"review_count"?: number,"subject_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "back"?: string,"box"?: number,"created_at"?: string,"due_at"?: string,"front"?: string,"id"?: string,"material_id"?: string | null,"review_count"?: number,"subject_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcards_material_id_user_id_fkey"
      columns: ["material_id","user_id"]
isOneToOne: false
      referencedRelation: "study_materials"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "flashcards_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"goal_reflections": {
                  Row: {
                    "content": string,"created_at": string,"goal_id": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"goal_id": string,"id"?: string,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"goal_id"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_reflections_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "category": Database["public"]['Enums']["goal_category"],"created_at": string,"description": string | null,"id": string,"notes": string | null,"priority": Database["public"]['Enums']["priority"],"progress": number,"status": Database["public"]['Enums']["goal_status"],"target_date": string | null,"title": string,"updated_at": string,"user_id": string,"why": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["goal_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"notes"?: string | null,"priority"?: Database["public"]['Enums']["priority"],"progress"?: number,"status"?: Database["public"]['Enums']["goal_status"],"target_date"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string,"why"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["goal_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"notes"?: string | null,"priority"?: Database["public"]['Enums']["priority"],"progress"?: number,"status"?: Database["public"]['Enums']["goal_status"],"target_date"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string,"why"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"habit_entries": {
                  Row: {
                    "created_at": string,"done": boolean,"entry_date": string,"habit_id": string,"id": string,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"done"?: boolean,"entry_date": string,"habit_id": string,"id"?: string,"note"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"done"?: boolean,"entry_date"?: string,"habit_id"?: string,"id"?: string,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_entries_habit_id_user_id_fkey"
      columns: ["habit_id","user_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "archived": boolean,"color": string,"created_at": string,"description": string | null,"frequency": Database["public"]['Enums']["habit_frequency"],"goal_id": string | null,"id": string,"reminder_time": string | null,"target_per_week": number,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"description"?: string | null,"frequency"?: Database["public"]['Enums']["habit_frequency"],"goal_id"?: string | null,"id"?: string,"reminder_time"?: string | null,"target_per_week"?: number,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"description"?: string | null,"frequency"?: Database["public"]['Enums']["habit_frequency"],"goal_id"?: string | null,"id"?: string,"reminder_time"?: string | null,"target_per_week"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"journal_entries": {
                  Row: {
                    "ai_reflection": string | null,"answers": NonNullable<Json>,"content": string,"created_at": string,"entry_date": string,"gratitude": string | null,"id": string,"mood": number | null,"tags": (string)[],"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_reflection"?: string | null,"answers"?: NonNullable<Json>,"content"?: string,"created_at"?: string,"entry_date"?: string,"gratitude"?: string | null,"id"?: string,"mood"?: number | null,"tags"?: (string)[],"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "ai_reflection"?: string | null,"answers"?: NonNullable<Json>,"content"?: string,"created_at"?: string,"entry_date"?: string,"gratitude"?: string | null,"id"?: string,"mood"?: number | null,"tags"?: (string)[],"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"material_chunks": {
                  Row: {
                    "chunk_index": number,"content": string,"created_at": string,"embedding": string | null,"id": string,"material_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chunk_index": number,"content": string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"material_id": string,"user_id"?: string
                  }
                  Update: {
                    "chunk_index"?: number,"content"?: string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"material_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_chunks_material_id_user_id_fkey"
      columns: ["material_id","user_id"]
isOneToOne: false
      referencedRelation: "study_materials"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "created_at": string,"done": boolean,"done_at": string | null,"due_date": string | null,"goal_id": string,"id": string,"position": number,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"done"?: boolean,"done_at"?: string | null,"due_date"?: string | null,"goal_id": string,"id"?: string,"position"?: number,"title": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"done"?: boolean,"done_at"?: string | null,"due_date"?: string | null,"goal_id"?: string,"id"?: string,"position"?: number,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "attempts": number,"body": string | null,"channels": (string)[],"created_at": string,"id": string,"last_error": string | null,"read_at": string | null,"scheduled_for": string,"sent_at": string | null,"source_id": string | null,"source_type": string | null,"title": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"body"?: string | null,"channels"?: (string)[],"created_at"?: string,"id"?: string,"last_error"?: string | null,"read_at"?: string | null,"scheduled_for": string,"sent_at"?: string | null,"source_id"?: string | null,"source_type"?: string | null,"title": string,"url"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "attempts"?: number,"body"?: string | null,"channels"?: (string)[],"created_at"?: string,"id"?: string,"last_error"?: string | null,"read_at"?: string | null,"scheduled_for"?: string,"sent_at"?: string | null,"source_id"?: string | null,"source_type"?: string | null,"title"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "ai_context_enabled": boolean,"ai_journal_access": boolean,"created_at": string,"day_end": string,"day_start": string,"default_reminder_offsets": (number)[],"display_name": string | null,"email_notifications": boolean,"id": string,"notification_email": string | null,"push_notifications": boolean,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_context_enabled"?: boolean,"ai_journal_access"?: boolean,"created_at"?: string,"day_end"?: string,"day_start"?: string,"default_reminder_offsets"?: (number)[],"display_name"?: string | null,"email_notifications"?: boolean,"id": string,"notification_email"?: string | null,"push_notifications"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "ai_context_enabled"?: boolean,"ai_journal_access"?: boolean,"created_at"?: string,"day_end"?: string,"day_start"?: string,"default_reminder_offsets"?: (number)[],"display_name"?: string | null,"email_notifications"?: boolean,"id"?: string,"notification_email"?: string | null,"push_notifications"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quick_notes": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"pinned": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"user_id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quiz_attempts": {
                  Row: {
                    "answers": NonNullable<Json>,"created_at": string,"id": string,"quiz_id": string,"score": number,"total": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers": NonNullable<Json>,"created_at"?: string,"id"?: string,"quiz_id": string,"score": number,"total": number,"user_id"?: string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"quiz_id"?: string,"score"?: number,"total"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_attempts_quiz_id_user_id_fkey"
      columns: ["quiz_id","user_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"quizzes": {
                  Row: {
                    "created_at": string,"id": string,"material_id": string | null,"questions": NonNullable<Json>,"subject_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"material_id"?: string | null,"questions": NonNullable<Json>,"subject_id"?: string | null,"title": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"material_id"?: string | null,"questions"?: NonNullable<Json>,"subject_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quizzes_material_id_user_id_fkey"
      columns: ["material_id","user_id"]
isOneToOne: false
      referencedRelation: "study_materials"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "quizzes_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"study_materials": {
                  Row: {
                    "created_at": string,"error": string | null,"extracted_text": string | null,"id": string,"kind": Database["public"]['Enums']["material_kind"],"mime_type": string | null,"processed_at": string | null,"size_bytes": number | null,"status": Database["public"]['Enums']["material_status"],"storage_path": string | null,"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["material_kind"],"mime_type"?: string | null,"processed_at"?: string | null,"size_bytes"?: number | null,"status"?: Database["public"]['Enums']["material_status"],"storage_path"?: string | null,"subject_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["material_kind"],"mime_type"?: string | null,"processed_at"?: string | null,"size_bytes"?: number | null,"status"?: Database["public"]['Enums']["material_status"],"storage_path"?: string | null,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_materials_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "archived": boolean,"code": string | null,"color": string,"created_at": string,"description": string | null,"ects": number | null,"id": string,"name": string,"professor": string | null,"professor_email": string | null,"professor_office_hours": string | null,"progress": number,"room": string | null,"semester": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"code"?: string | null,"color"?: string,"created_at"?: string,"description"?: string | null,"ects"?: number | null,"id"?: string,"name": string,"professor"?: string | null,"professor_email"?: string | null,"professor_office_hours"?: string | null,"progress"?: number,"room"?: string | null,"semester"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "archived"?: boolean,"code"?: string | null,"color"?: string,"created_at"?: string,"description"?: string | null,"ects"?: number | null,"id"?: string,"name"?: string,"professor"?: string | null,"professor_email"?: string | null,"professor_office_hours"?: string | null,"progress"?: number,"room"?: string | null,"semester"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "category": string | null,"completed_at": string | null,"created_at": string,"description": string | null,"due_at": string | null,"estimated_minutes": number | null,"goal_id": string | null,"id": string,"postponed_count": number,"priority": Database["public"]['Enums']["priority"],"recurrence": Database["public"]['Enums']["recurrence"],"recurrence_source_id": string | null,"scheduled_date": string | null,"status": Database["public"]['Enums']["task_status"],"subject_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_at"?: string | null,"estimated_minutes"?: number | null,"goal_id"?: string | null,"id"?: string,"postponed_count"?: number,"priority"?: Database["public"]['Enums']["priority"],"recurrence"?: Database["public"]['Enums']["recurrence"],"recurrence_source_id"?: string | null,"scheduled_date"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"subject_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "category"?: string | null,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"due_at"?: string | null,"estimated_minutes"?: number | null,"goal_id"?: string | null,"id"?: string,"postponed_count"?: number,"priority"?: Database["public"]['Enums']["priority"],"recurrence"?: Database["public"]['Enums']["recurrence"],"recurrence_source_id"?: string | null,"scheduled_date"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_recurrence_source_id_fkey"
      columns: ["recurrence_source_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_subject_id_user_id_fkey"
      columns: ["subject_id","user_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"time_blocks": {
                  Row: {
                    "block_date": string,"created_at": string,"end_time": string,"id": string,"kind": string,"notes": string | null,"start_time": string,"task_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_date": string,"created_at"?: string,"end_time": string,"id"?: string,"kind"?: string,"notes"?: string | null,"start_time": string,"task_id"?: string | null,"title": string,"user_id"?: string
                  }
                  Update: {
                    "block_date"?: string,"created_at"?: string,"end_time"?: string,"id"?: string,"kind"?: string,"notes"?: string | null,"start_time"?: string,"task_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_blocks_task_id_user_id_fkey"
      columns: ["task_id","user_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "match_material_chunks":
{ Args: { "filter_material"?: string,"filter_subject"?: string,"match_count"?: number,"query_embedding": string }; Returns: {
              "content": string,"id": string,"material_id": string,"material_title": string,"similarity": number
            }[]
                           }
          }
          Enums: {
            "academic_kind": "exam"|"test"|"assignment"|"project","goal_category": "education"|"career"|"health"|"finances"|"relationships"|"personal"|"hobbies"|"other","goal_status": "active"|"paused"|"completed"|"abandoned","habit_frequency": "daily"|"weekly","material_kind": "pdf"|"audio"|"presentation"|"image"|"text"|"other","material_status": "uploaded"|"processing"|"ready"|"error","note_kind": "lecture_notes"|"summary"|"explanation"|"exam_prep"|"study_plan"|"manual","priority": "low"|"medium"|"high"|"urgent","recurrence": "none"|"daily"|"weekdays"|"weekly"|"monthly","task_status": "todo"|"in_progress"|"done"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "academic_kind": ["exam", "test", "assignment", "project"],"goal_category": ["education", "career", "health", "finances", "relationships", "personal", "hobbies", "other"],"goal_status": ["active", "paused", "completed", "abandoned"],"habit_frequency": ["daily", "weekly"],"material_kind": ["pdf", "audio", "presentation", "image", "text", "other"],"material_status": ["uploaded", "processing", "ready", "error"],"note_kind": ["lecture_notes", "summary", "explanation", "exam_prep", "study_plan", "manual"],"priority": ["low", "medium", "high", "urgent"],"recurrence": ["none", "daily", "weekdays", "weekly", "monthly"],"task_status": ["todo", "in_progress", "done", "cancelled"]
          }
        }
} as const
