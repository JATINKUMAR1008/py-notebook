from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from jupyter_client import KernelManager

app = FastAPI()

# Create a persistent kernel session
km = KernelManager()
km.start_kernel()
kc = km.client()
kc.start_channels()

class CellRequest(BaseModel):
    cell: str

@app.get("/")
async def read_root():
    return {"Hello": "World"}

@app.post("/execute-cell")
async def execute_cell(request: CellRequest):
    try:
        # Send the cell content to the kernel for execution
        kc.execute(request.cell)
        reply = kc.get_shell_msg(timeout=10)
        
        # Capture execution results
        output_msgs = []
        while True:
            msg = kc.get_iopub_msg(timeout=1)
            if msg['msg_type'] == 'stream':
                output_msgs.append(msg['content']['text'])
            elif msg['msg_type'] == 'execute_result':
                output_msgs.append(msg['content']['data']['text/plain'])
            elif msg['msg_type'] == 'error':
                output_msgs.append('\n'.join(msg['content']['traceback']))
            elif msg['msg_type'] == 'status' and msg['content']['execution_state'] == 'idle':
                break

        return JSONResponse(content={"output": ''.join(output_msgs)})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)