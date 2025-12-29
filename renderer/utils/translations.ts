export type Language = 'ko' | 'en';

export const translations = {
  ko: {
    // 카테고리
    cat_mouse: '마우스 제어',
    cat_keyboard: '키보드 입력',
    cat_flow: '흐름 제어',
    cat_record: '실시간 녹화',

    // 도구
    tool_click: '클릭',
    tool_drag: '드래그 앤 드롭',
    tool_scroll: '마우스 휠 스크롤',
    tool_repeat: '마우스 연타',
    tool_text: '텍스트 자동 입력',
    tool_shortcut: '단축키 입력',
    tool_key_adv: '키보드 연타',
    tool_wait: '시간 대기',
    tool_if: '조건부 분기 (IF)',

    // 헤더
    app_title: 'MyMate Studio',
    app_subtitle: 'PROFESSIONAL RPA',
    recording: '녹화 중지',
    start_record: '실시간 녹화',
    play: '자동화 시작',
    emergency_stop: '긴급 정지 (F12)',
    settings: '환경 설정',

    // 설정 모달
    settings_title: '환경 설정',
    auto_hide: '자동화 실행 시 창 숨기기',
    panic_key: '긴급 정지 단축키',
    record_start_key: '실시간 녹화 시작',
    record_stop_key: '녹화 종료',
    hotkey_settings: '단축키 설정',
    save_hotkeys: '단축키 저장 및 적용',
    language: '언어 설정',
    language_ko: '한국어',
    language_en: 'English',
    start_recording: '녹화 시작',
    stop_recording: '녹화 중지',
    save_file: '저장하기',
    load_file: '불러오기',

    // 사이드바
    sidebar_title: '작업 도구',

    // 우측 패널
    block_detail: '블록 상세 설정',
    recognition_conditions: '인식 조건 추가 (조합 가능)',
    target_coord: '기본 좌표 지정',
    target_coord_desc: '클릭하여 좌표 선택',
    target_image: '이미지/UI 인식',
    target_image_desc: '클릭하여 화면 캡처',
    target_color: '색상 인식',
    target_color_desc: '좌표의 색상 자동 추출',
    coord_x: 'X 좌표',
    coord_y: 'Y 좌표',

    // 블록 설정
    input_text: '입력할 텍스트',
    input_placeholder: '여기에 텍스트를 입력하세요...',
    wait_time: '대기 시간 (ms)',
    button_type: '버튼 종류',
    button_left: '왼쪽 클릭',
    button_right: '오른쪽 클릭',
    click_count: '클릭 횟수',
    click_interval: '클릭 간격 (ms)',
    repeat_key: '반복할 키',
    repeat_key_placeholder: '예: Enter, Space, A',
    repeat_count: '반복 횟수',
    key_interval: '입력 간격 (ms)',
    registered_image: '등록된 이미지',
    confidence: '인식 신뢰도',
    confidence_low: '낮음 (빠름)',
    confidence_high: '높음 (정확)',
    if_block_title: '🌿 IF 조건문 블록',
    if_block_desc: '이 블록은 이미지가 발견되면 TRUE 분기를, 발견되지 않으면 FALSE 분기를 실행합니다. 타임라인에서 자식 블록을 확인할 수 있습니다.',
    delete_block: '이 블록 삭제하기',
    select_block: '블록을 선택하여 상세 내용을 수정하세요',

    // 타임라인
    start_work: '작업을 시작하세요',
    no_blocks: '왼쪽 메뉴에서 도구를 추가하세요',

    // 상태 메시지
    status_failed: '❌ 실패:',
    status_skipped: '⚠️ 건너뜀:',
    branch_true: '성공 (TRUE)',
    branch_false: '실패 (FALSE)'
  },
  en: {
    // Categories
    cat_mouse: 'Mouse Control',
    cat_keyboard: 'Keyboard Input',
    cat_flow: 'Flow Control',
    cat_record: 'Real-time Recording',

    // Tools
    tool_click: 'Click',
    tool_drag: 'Drag & Drop',
    tool_scroll: 'Mouse Wheel Scroll',
    tool_repeat: 'Repeat Click',
    tool_text: 'Auto Type Text',
    tool_shortcut: 'Keyboard Shortcut',
    tool_key_adv: 'Repeat Key',
    tool_wait: 'Wait Delay',
    tool_if: 'IF Condition',

    // Header
    app_title: 'MyMate Studio',
    app_subtitle: 'PROFESSIONAL RPA',
    recording: 'Stop Recording',
    start_record: 'Start Recording',
    play: 'Start Automation',
    emergency_stop: 'Emergency Stop (F12)',
    settings: 'Settings',

    // Settings Modal
    settings_title: 'Settings',
    auto_hide: 'Auto-hide window during execution',
    panic_key: 'Emergency stop hotkey',
    record_start_key: 'Start Recording',
    record_stop_key: 'Stop Recording',
    hotkey_settings: 'Hotkey Settings',
    save_hotkeys: 'Save & Apply Hotkeys',
    language: 'Language',
    language_ko: '한국어',
    language_en: 'English',
    start_recording: 'Start Recording',
    stop_recording: 'Stop Recording',
    save_file: 'Save',
    load_file: 'Load',

    // Sidebar
    sidebar_title: 'Tools',

    // Right Panel
    block_detail: 'Block Details',
    recognition_conditions: 'Add Recognition Conditions (Combinable)',
    target_coord: 'Set Coordinate',
    target_coord_desc: 'Click to select coordinate',
    target_image: 'Image/UI Recognition',
    target_image_desc: 'Click to capture screen',
    target_color: 'Color Recognition',
    target_color_desc: 'Auto-extract color at coordinate',
    coord_x: 'X Coordinate',
    coord_y: 'Y Coordinate',

    // Block Settings
    input_text: 'Text to Input',
    input_placeholder: 'Enter text here...',
    wait_time: 'Wait Time (ms)',
    button_type: 'Button Type',
    button_left: 'Left Click',
    button_right: 'Right Click',
    click_count: 'Click Count',
    click_interval: 'Click Interval (ms)',
    repeat_key: 'Key to Repeat',
    repeat_key_placeholder: 'e.g., Enter, Space, A',
    repeat_count: 'Repeat Count',
    key_interval: 'Key Interval (ms)',
    registered_image: 'Registered Image',
    confidence: 'Recognition Confidence',
    confidence_low: 'Low (Fast)',
    confidence_high: 'High (Accurate)',
    if_block_title: '🌿 IF Condition Block',
    if_block_desc: 'This block executes the TRUE branch if the image is found, and the FALSE branch if not. Check child blocks in the timeline.',
    delete_block: 'Delete This Block',
    select_block: 'Select a block to edit details',

    // Timeline
    start_work: 'Start Your Work',
    no_blocks: 'Add tools from the left menu',

    // Status Messages
    status_failed: '❌ Failed:',
    status_skipped: '⚠️ Skipped:',
    branch_true: 'Success (TRUE)',
    branch_false: 'Failure (FALSE)'
  }
};
