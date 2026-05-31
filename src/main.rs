use std::{fs, path::PathBuf};

use clap::{Parser, Subcommand};
use commonware_bft_lab::{ConsensusConfig, DecisionPayload, Validator, implementation_runbook};

#[derive(Debug, Parser)]
#[command(name = "commonware-bft-lab")]
#[command(about = "Prepare deterministic decision-log payloads for a Commonware Simplex BFT lab")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    InitConfig {
        #[arg(long, default_value = "bft-lab-local")]
        network_id: String,
        #[arg(long, default_value = "/tmp/commonware-bft-lab")]
        storage_dir: String,
    },
    Prepare {
        #[arg(long)]
        config: PathBuf,
        #[arg(long)]
        payload: PathBuf,
    },
    Runbook {
        #[arg(long)]
        config: PathBuf,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Command::InitConfig {
            network_id,
            storage_dir,
        } => {
            let config = ConsensusConfig {
                network_id,
                storage_dir,
                max_payload_bytes: 64 * 1024,
                validators: (1..=4)
                    .map(|i| Validator {
                        id: format!("validator-{i}"),
                        public_key: format!("replace-with-validator-{i}-public-key"),
                        address: format!("127.0.0.1:300{i}"),
                    })
                    .collect(),
            };
            println!("{}", serde_json::to_string_pretty(&config)?);
        }
        Command::Prepare { config, payload } => {
            let config: ConsensusConfig = serde_json::from_str(&fs::read_to_string(config)?)?;
            let payload: DecisionPayload = serde_json::from_str(&fs::read_to_string(payload)?)?;
            let prepared = config.prepare_payload(&payload)?;
            println!("{}", serde_json::to_string_pretty(&prepared)?);
        }
        Command::Runbook { config } => {
            let config: ConsensusConfig = serde_json::from_str(&fs::read_to_string(config)?)?;
            for line in implementation_runbook(&config)? {
                println!("{line}");
            }
        }
    }

    Ok(())
}
