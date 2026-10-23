$code = @"
using System;
using System.IO;
using System.Net;
using System.Threading;

public class FastStaticServer
{
    private HttpListener _listener;
    private string _rootPath;
    private bool _running;

    public int BoundPort { get; private set; }

    public bool Start(string rootPath, int[] candidatePorts)
    {
        _rootPath = Path.GetFullPath(rootPath);

        foreach (int port in candidatePorts)
        {
            try
            {
                _listener = new HttpListener();
                string prefix = string.Format("http://localhost:{0}/", port);
                _listener.Prefixes.Add(prefix);
                _listener.Start();
                BoundPort = port;
                _running = true;
                _listener.BeginGetContext(OnContextReceived, null);
                return true;
            }
            catch
            {
                if (_listener != null)
                {
                    try { _listener.Close(); } catch { }
                    _listener = null;
                }
            }
        }
        return false;
    }

    private void OnContextReceived(IAsyncResult ar)
    {
        if (!_running || _listener == null) return;

        HttpListenerContext context = null;
        try
        {
            context = _listener.EndGetContext(ar);
        }
        catch
        {
            // Listener stopped or failed
            return;
        }

        // Immediately listen for next request on threadpool
        if (_running && _listener.IsListening)
        {
            try { _listener.BeginGetContext(OnContextReceived, null); } catch { }
        }

        ThreadPool.QueueUserWorkItem((state) =>
        {
            ProcessRequest(context);
        });
    }

    private void ProcessRequest(HttpListenerContext context)
    {
        try
        {
            HttpListenerRequest req = context.Request;
            HttpListenerResponse res = context.Response;

            string rawPath = req.Url.LocalPath.TrimStart('/');
            if (string.IsNullOrEmpty(rawPath))
            {
                rawPath = "index.html";
            }

            string decoded = Uri.UnescapeDataString(rawPath).Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.Combine(_rootPath, decoded);

            // Clean URL routing: support /journey -> journey.html and directories
            if (!File.Exists(fullPath) && File.Exists(fullPath + ".html"))
            {
                fullPath = fullPath + ".html";
            }
            else if (Directory.Exists(fullPath))
            {
                string idx = Path.Combine(fullPath, "index.html");
                if (File.Exists(idx)) fullPath = idx;
            }

            if (File.Exists(fullPath))
            {
                string ext = Path.GetExtension(fullPath).ToLowerInvariant();
                string mime = "application/octet-stream";
                switch (ext)
                {
                    case ".html":
                    case ".htm":
                        mime = "text/html; charset=utf-8";
                        break;
                    case ".css":
                        mime = "text/css; charset=utf-8";
                        break;
                    case ".js":
                        mime = "application/javascript; charset=utf-8";
                        break;
                    case ".jpg":
                    case ".jpeg":
                        mime = "image/jpeg";
                        break;
                    case ".png":
                        mime = "image/png";
                        break;
                    case ".webp":
                        mime = "image/webp";
                        break;
                    case ".json":
                        mime = "application/json";
                        break;
                }

                res.ContentType = mime;
                res.Headers.Add("Access-Control-Allow-Origin", "*");
                if (ext == ".html" || ext == ".css" || ext == ".js")
                {
                    res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate");
                }
                else
                {
                    res.Headers.Add("Cache-Control", "public, max-age=86400");
                }

                using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, FileOptions.SequentialScan))
                {
                    res.ContentLength64 = fs.Length;
                    fs.CopyTo(res.OutputStream);
                }
            }
            else
            {
                res.StatusCode = 404;
                byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found");
                res.ContentLength64 = notFound.Length;
                res.OutputStream.Write(notFound, 0, notFound.Length);
            }
        }
        catch
        {
            // Ignore client network disconnects
        }
        finally
        {
            try
            {
                context.Response.OutputStream.Close();
                context.Response.Close();
            }
            catch { }
        }
    }

    public void Stop()
    {
        _running = false;
        if (_listener != null)
        {
            try { _listener.Stop(); } catch { }
            try { _listener.Close(); } catch { }
        }
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp

$server = New-Object FastStaticServer
$candidatePorts = [int[]]@(5000, 3000, 5173, 8000, 8888, 9000, 8081)

if ($server.Start($PSScriptRoot, $candidatePorts)) {
    Write-Output "FAST_SERVER_READY: http://localhost:$($server.BoundPort)/"
    while ($true) {
        Start-Sleep -Seconds 3600
    }
} else {
    Write-Error "Failed to start server on any port."
    exit 1
}
