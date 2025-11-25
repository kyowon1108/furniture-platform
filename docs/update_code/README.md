# Update Code Documentation

이 디렉토리는 프로젝트 수정 시 생성되는 설명 파일들을 저장합니다.

## 파일 명명 규칙

- 형식: `기존파일명_HHMMSS.md`
- 예시: `COLLISION_DETECTION_IMPROVEMENT_140026.md`
- HHMMSS: 파일 생성 시간 (시:분:초)

## 사용 방법

앞으로 코드 수정 시 생성하는 설명 파일은 이 디렉토리에 저장하세요.

```bash
# 예시: 새로운 설명 파일 생성
TIMESTAMP=$(date +%H%M%S)
FILENAME="NEW_FEATURE_${TIMESTAMP}.md"
# 파일 내용 작성 후
mv "$FILENAME" "docs/update_code/"
```

## 파일 목록

현재 저장된 파일들은 프로젝트 루트에서 이동된 문서들입니다.




