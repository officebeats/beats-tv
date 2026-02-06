use crate::settings::get_default_record_path;
use crate::types::{AppState, ChannelHttpHeaders, Source};
use crate::utils::get_bin;
use crate::{log, sql};
use crate::{media_type, settings::get_settings, types::Channel};
use anyhow::{Context, Result};
use chrono::Local;

use std::sync::LazyLock;
use std::{env::consts::OS, path::Path, process::Stdio};
use tauri::State;
use tokio::sync::Mutex;
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};
use tokio_util::sync::CancellationToken;

const VLC_BIN_NAME: &str = "vlc";

// On Windows/macOS, we might need to look in specific places if not in PATH, 
// but for now we rely on utils::get_bin which likely uses 'which' crate logic.
static VLC_PATH: LazyLock<String> = LazyLock::new(|| get_bin(VLC_BIN_NAME));

pub async fn play(
    channel: Channel,
    record: bool,
    record_path: Option<String>,
    state: State<'_, Mutex<AppState>>,
) -> Result<()> {
    eprintln!(
        "{} playing with VLC",
        channel.url.as_ref().context("no channel url")?
    );
    let source = channel
        .source_id
        .and_then(|id| {
            sql::get_source_from_id(id)
                .with_context(|| format!("failed to fetch source with id {}", id))
                .ok()
        })
        .or(None);
    let args = get_play_args(&channel, record, record_path, &source)?;
    eprintln!("with args: {:?}", args);

    if let Some(source) = source.as_ref() {
        _ = crate::utils::handle_max_streams(source, &state)
            .await
            .map_err(|e| log::log(format!("{:?}", e)));
    }

    let mut cmd = Command::new(VLC_PATH.clone())
        .args(args)
        .stdout(Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;
    
    let token = CancellationToken::new();
    let channel_id = channel.id.context("no channel id")?;
    if let Some(source_id) = source.as_ref().and_then(|s| s.id) {
        _ = crate::utils::insert_play_token(
            source_id,
            channel_id.to_string(),
            token.clone(),
            &state,
        )
        .await
        .map_err(|e| log::log(format!("{:?}", e)));
    }
    
    let result: Result<()> = tokio::select! {
        status = cmd.wait() => {
            let status = status?;
            if status.success() {
                Ok(())
            } else {
                let stdout = cmd.stdout.take();
                if stdout.is_none() {
                     Ok(())
                } else {
                    let stdout = stdout.context("no stdout")?;
                    let mut error: String = String::new();
                    let mut lines = BufReader::new(stdout).lines();
                    let mut first = true;
                    while let Some(line) = lines.next_line().await? {
                        error += &line;
                        if !first {
                            error += "\n";
                        } else {
                            first = false;
                        }
                    }
                    if error != "" {
                        Err(anyhow::anyhow!(error))
                    } else {
                        Err(anyhow::anyhow!("VLC encountered an unknown error"))
                    }
                }
            }
        },
        _ = token.cancelled() => {
            cmd.kill().await?;
            Ok(())
        }
    };

    if let Some(source_id) = source.as_ref().and_then(|s| s.id) {
        _ = crate::utils::remove_from_play_stop(state, &source_id, &channel_id.to_string())
            .await
            .map_err(|e| log::log(format!("{:?}", e)));
    }
    result
}

fn get_play_args(
    channel: &Channel,
    record: bool,
    record_path: Option<String>,
    source: &Option<Source>,
) -> Result<Vec<String>> {
    let mut args = Vec::new();
    let settings = get_settings()?;
    let headers = sql::get_channel_headers_by_id(channel.id.context("no channel id?")?)?;
    
    // URL logic
    args.push(channel.url.clone().context("no url")?);

    // Headers logic
    if headers.is_some() || source.is_some() {
        set_headers(headers, &mut args, source);
    }

    // Recording logic (experimental for VLC)
    if record {
        let path = if let Some(p) = record_path {
            p
        } else if let Some(p) = settings.recording_path.map(get_path) {
            p
        } else {
            get_path(get_default_record_path()?)
        };
        // Basic sout for recording to file. Note: This might need transcoding/muxing depending on stream.
        // Using #std{access=file,mux=ts,dst=...} is a common pattern for IPTV streams.
        args.push(format!("--sout=#std{{access=file,mux=ts,dst={}}}", path));
    }

    Ok(args)
}

fn set_headers(
    headers: Option<ChannelHttpHeaders>,
    args: &mut Vec<String>,
    source: &Option<Source>,
) {
    let headers = headers.unwrap_or_default();
    
    if let Some(referrer) = headers.referrer {
        args.push(format!("--http-referrer={}", referrer));
    }
    
    if let Some(user_agent) = headers
        .user_agent
        .or_else(|| source.as_ref().and_then(|f| f.stream_user_agent.clone()))
    {
        args.push(format!("--http-user-agent={}", user_agent));
    }
}

fn get_path(path_str: String) -> String {
    let path = Path::new(&path_str);
    let path = path.join(get_file_name());
    return path.to_string_lossy().to_string();
}

fn get_file_name() -> String {
    let current_time = Local::now();
    let formatted_time = current_time.format("%Y-%m-%d-%H-%M-%S").to_string();
    format!("{formatted_time}.ts") 
}
