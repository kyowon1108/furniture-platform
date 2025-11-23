"""Logging API endpoints for saving frontend logs to files."""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Union

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter()

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Global log file - created once when server starts
_current_log_file: Optional[Path] = None
_server_start_time: Optional[datetime] = None


def initialize_log_file():
    """Initialize log file when server starts. Called once."""
    global _current_log_file, _server_start_time
    
    if _current_log_file is None:
        _server_start_time = datetime.now()
        timestamp_str = _server_start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"logs_{timestamp_str}.log"
        _current_log_file = LOGS_DIR / filename
        
        # Write header to log file
        with open(_current_log_file, "w", encoding="utf-8") as f:
            f.write(f"=== Log File Created: {_server_start_time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            f.write(f"Server started at: {_server_start_time.isoformat()}\n")
            f.write("=" * 80 + "\n\n")
        
        print(f"📝 Log file initialized: {_current_log_file}")
    
    return _current_log_file


def finalize_log_file():
    """Finalize log file when server shuts down."""
    global _current_log_file, _server_start_time
    
    if _current_log_file and _current_log_file.exists():
        end_time = datetime.now()
        with open(_current_log_file, "a", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write(f"=== Server Shutdown: {end_time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            if _server_start_time:
                duration = end_time - _server_start_time
                f.write(f"Server ran for: {duration}\n")
            f.write("=== End of Log File ===\n")
        
        print(f"📝 Log file finalized: {_current_log_file}")


def get_current_log_file() -> Path:
    """Get current log file, creating it if necessary."""
    if _current_log_file is None:
        return initialize_log_file()
    return _current_log_file


class LogEntry(BaseModel):
    """Single log entry."""
    timestamp: str
    level: str  # 'log', 'info', 'warn', 'error', 'debug'
    message: str
    data: Optional[Any] = Field(default=None)  # Accept any JSON-serializable type
    
    class Config:
        # Allow extra fields and validate assignment
        extra = "allow"
        # Use enum values
        use_enum_values = True


class LogRequest(BaseModel):
    """Request to save logs."""
    logs: List[LogEntry]


@router.post("/save-logs")
async def save_logs(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save frontend logs to a file.

    Args:
        request: FastAPI request object
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message with file path
    """
    try:
        # Parse request body manually to handle validation errors
        body = await request.json()
        print(f"📥 Received request body: {type(body)}, keys: {body.keys() if isinstance(body, dict) else 'N/A'}")
        
        # Validate request
        try:
            log_request = LogRequest(**body)
        except ValidationError as e:
            print(f"❌ Validation error: {e}")
            print(f"❌ Error details: {e.errors()}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"validation_errors": e.errors(), "received_body": body}
            )
        
        # Debug: Log received data
        print(f"📥 Received {len(log_request.logs)} log entries from user {current_user.id}")
        
        # Get current log file (create if not exists)
        filepath = get_current_log_file()
        
        # Append logs to existing file
        with open(filepath, "a", encoding="utf-8") as f:
            # Write session separator
            now = datetime.now()
            f.write(f"\n{'=' * 80}\n")
            f.write(f"=== Session: {now.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            f.write(f"User: {current_user.email} (ID: {current_user.id})\n")
            f.write(f"Log Entries: {len(log_request.logs)}\n")
            f.write(f"{'=' * 80}\n\n")

            for log_entry in log_request.logs:
                # Format log entry
                level_marker = {
                    "log": "ℹ️",
                    "info": "ℹ️",
                    "warn": "⚠️",
                    "error": "❌",
                    "debug": "🔍",
                }.get(log_entry.level, "📝")

                f.write(f"[{log_entry.timestamp}] {level_marker} [{log_entry.level.upper()}] {log_entry.message}\n")
                
                if log_entry.data is not None:
                    # Format data as JSON-like string
                    try:
                        # Handle different data types
                        if isinstance(log_entry.data, (dict, list)):
                            data_str = json.dumps(log_entry.data, indent=2, ensure_ascii=False)
                        else:
                            # For primitive types, convert to string
                            data_str = str(log_entry.data)
                        f.write(f"  Data: {data_str}\n")
                    except Exception as e:
                        f.write(f"  Data: [Error serializing data: {str(e)}]\n")
                
                f.write("\n")

        return {
            "message": "Logs saved successfully",
            "filename": filepath.name,
            "filepath": str(filepath),
            "entry_count": len(log_request.logs),
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error saving logs: {str(e)}")
        print(f"Traceback: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save logs: {str(e)}",
        )
