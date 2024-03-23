from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import anthropic
from fastapi.responses import StreamingResponse
import subprocess

client = anthropic.Anthropic(api_key=os.get("ANTHROPIC_API_KEY"))
app = FastAPI()

# Set up CORS middleware
origins = [
    "http://localhost:4000",  # Assuming your React app runs on port 3000
    # You can add more origins as needed, or use "*" to allow all origins (not recommended for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    message: str

@app.post("/chat")
async def chat(message: ChatMessage):
    # Get the directory to read files from
    directory = "/Users/theshah/guardianai/exposedirectory"

    # Use the LLM to determine the appropriate ls command based on the user's prompt
    command_prompt = f"""
    User's file prompt: {message.message}
    
    Here are some examples of 'ls' commands:
    - ls: List all files and directories in the current directory
    - ls -l: List all files and directories in the current directory with detailed information
    - ls *.txt: List all files with the '.txt' extension in the current directory
    - ls -a: List all files and directories, including hidden ones, in the current directory
    
    What is the appropriate 'ls' command to execute based on the user's prompt?
    """

    command_completion = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=1024,
        system="Your task is to generate appropriate 'ls' commands based on the user's prompt.",
        messages=[
            {"role": "user", "content": command_prompt}
        ]
    )
    ls_command = command_completion.content[0].text.strip()

    # Execute the ls command in the specified directory
    try:
        output = subprocess.check_output(ls_command, cwd=directory, shell=True, universal_newlines=True)
        if output.strip() == "":
            prompt = "There are no files or directories matching the user's prompt in the specified directory."
        else:
            prompt = f"Here are the files and directories matching the user's prompt:\n\n{output}\n\nPlease provide a brief description of the contents."
    except subprocess.CalledProcessError as e:
        error_output = e.output.strip()
        if error_output:
            prompt = f"An error occurred while executing the command:\n\n{error_output}\n\nPlease provide guidance on resolving the issue."
        else:
            prompt = "An error occurred while executing the command. Please provide guidance on resolving the issue."

    try:
        # Send the request to the Claude API using the `messages.create()` method
        completion = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ],
            stream=True,  # Enable streaming
        )

        # Stream the response from Claude
        def generate_response():
            for chunk in completion.content[0].text_stream:
                yield chunk

        # Return the response as a streaming response
        return StreamingResponse(generate_response(), media_type="text/plain")

    except Exception as e:
        # Handle any errors that occur during the API request
        raise HTTPException(status_code=500, detail=str(e))