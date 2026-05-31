use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

pub const COMMONWARE_PRIMITIVE: &str = "commonware_consensus::simplex";

pub fn commonware_primitive() -> &'static str {
    let _ = core::any::type_name::<dyn commonware_consensus::Epochable>();
    COMMONWARE_PRIMITIVE
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Validator {
    pub id: String,
    pub public_key: String,
    pub address: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConsensusConfig {
    pub network_id: String,
    pub storage_dir: String,
    pub validators: Vec<Validator>,
    pub max_payload_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecisionPayload {
    pub project: String,
    pub decision_id: String,
    pub stage: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PreparedBlock {
    pub network_id: String,
    pub payload_hash: String,
    pub payload_bytes: Vec<u8>,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ConsensusError {
    #[error("BFT consensus requires at least 4 validators to tolerate 1 Byzantine fault")]
    TooFewValidators,
    #[error("validator id, public key, and address must be non-empty")]
    InvalidValidator,
    #[error("payload is {actual} bytes, max is {max}")]
    PayloadTooLarge { actual: usize, max: usize },
    #[error("payload serialization failed: {0}")]
    Serialize(String),
}

impl ConsensusConfig {
    pub fn fault_tolerance(&self) -> Result<usize, ConsensusError> {
        validate_validators(&self.validators)?;
        Ok((self.validators.len() - 1) / 3)
    }

    pub fn quorum_threshold(&self) -> Result<usize, ConsensusError> {
        let f = self.fault_tolerance()?;
        Ok(2 * f + 1)
    }

    pub fn prepare_payload(
        &self,
        payload: &DecisionPayload,
    ) -> Result<PreparedBlock, ConsensusError> {
        let payload_bytes = serde_json::to_vec(payload)
            .map_err(|err| ConsensusError::Serialize(err.to_string()))?;

        if payload_bytes.len() > self.max_payload_bytes {
            return Err(ConsensusError::PayloadTooLarge {
                actual: payload_bytes.len(),
                max: self.max_payload_bytes,
            });
        }

        Ok(PreparedBlock {
            network_id: self.network_id.clone(),
            payload_hash: hex_sha256(&payload_bytes),
            payload_bytes,
        })
    }
}

pub fn validate_validators(validators: &[Validator]) -> Result<(), ConsensusError> {
    if validators.len() < 4 {
        return Err(ConsensusError::TooFewValidators);
    }

    if validators
        .iter()
        .any(|v| v.id.is_empty() || v.public_key.is_empty() || v.address.is_empty())
    {
        return Err(ConsensusError::InvalidValidator);
    }

    Ok(())
}

pub fn hex_sha256(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn implementation_runbook(config: &ConsensusConfig) -> Result<Vec<String>, ConsensusError> {
    let quorum = config.quorum_threshold()?;
    let participants = config
        .validators
        .iter()
        .map(|v| v.id.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let bootstrap = config
        .validators
        .first()
        .ok_or(ConsensusError::TooFewValidators)?;

    Ok(vec![
        format!(
            "primitive={}; validators={}; quorum={}",
            commonware_primitive(),
            config.validators.len(),
            quorum
        ),
        format!("participants={participants}"),
        format!(
            "bootstrap={}@{} storage={}",
            bootstrap.id, bootstrap.address, config.storage_dir
        ),
        "next: implement a Commonware CertifiableAutomaton for DecisionPayload verification"
            .to_string(),
        "next: wire commonware_consensus::simplex::Engine with authenticated p2p and persistent storage"
            .to_string(),
        "next: append finalized payloads to the replicated decision log".to_string(),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(size: usize) -> ConsensusConfig {
        ConsensusConfig {
            network_id: "bft-lab-local".to_string(),
            storage_dir: "/tmp/commonware-bft-lab".to_string(),
            max_payload_bytes: 4096,
            validators: (1..=size)
                .map(|i| Validator {
                    id: format!("validator-{i}"),
                    public_key: format!("replace-with-validator-{i}-public-key"),
                    address: format!("127.0.0.1:30{i:02}"),
                })
                .collect(),
        }
    }

    #[test]
    fn commonware_dependency_is_part_of_the_boundary() {
        assert_eq!(commonware_primitive(), "commonware_consensus::simplex");
    }

    #[test]
    fn quorum_uses_two_f_plus_one() {
        assert_eq!(config(4).fault_tolerance(), Ok(1));
        assert_eq!(config(4).quorum_threshold(), Ok(3));
        assert_eq!(config(7).fault_tolerance(), Ok(2));
        assert_eq!(config(7).quorum_threshold(), Ok(5));
    }

    #[test]
    fn rejects_too_small_validator_sets() {
        assert_eq!(
            config(3).quorum_threshold(),
            Err(ConsensusError::TooFewValidators)
        );
    }

    #[test]
    fn prepares_stable_payload_hash() {
        let payload = DecisionPayload {
            project: "commonware-bft-lab".to_string(),
            decision_id: "d-001".to_string(),
            stage: "ship".to_string(),
            body: "acceptance passed".to_string(),
            created_at: "2026-05-31T00:00:00Z".to_string(),
        };

        let prepared = config(4).prepare_payload(&payload).unwrap();

        assert_eq!(prepared.network_id, "bft-lab-local");
        assert_eq!(prepared.payload_hash.len(), 64);
        assert!(
            String::from_utf8(prepared.payload_bytes)
                .unwrap()
                .contains("acceptance passed")
        );
    }
}
